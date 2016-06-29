var Hoek = require('hoek');
var Boom = require('boom');
var Joi = require('joi');
var Wreck = require('wreck');

var internals = {};

exports.register = function (plugin, options, next) {
    plugin.auth.scheme('access-token', internals.implementation);
    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};

internals.schema = Joi.object({
    accessTokenKeyName: Joi.string(),
    profileUrl: Joi.string(),
    validateFunc: Joi.func().required().description('The function which will parse the user profile from the response object'),
    requestOptions: Joi.object().description('The Wreck request options')
});

internals.defaults = {
    accessTokenKeyName: 'access_token',
    profileUrl: 'https://graph.facebook.com/v2.6/me?access_token=',
    requestOptions: {
        timeout: 10000,
        maxBytes: 1048576, // 1 mb - very generous!
    }
};

internals.implementation = function (server, options) {
    Hoek.assert(options, internals.schema);
    internals.options = Hoek.applyToDefaults(internals.defaults, options);

    return { authenticate: internals.authenticate, payload: internals.authenticateWithPayload };
};

internals.authenticate = function (request, reply) {

    var accessToken;
    if (request.query && request.query[internals.options.accessTokenKeyName]) {
        accessToken = request.query[internals.options.accessTokenKeyName];
    }

    if (!accessToken && request.payload && request.payload[internals.options.accessTokenKeyName]) {
        accessToken = request.payload[internals.options.accessTokenKeyName];
    }

    if (!accessToken) {
        // Set this here so it'll try the authenticate with payload method
        return reply.continue({credentials: {}});
    }

    Wreck.get(internals.options.profileUrl + encodeURIComponent(accessToken), internals.options.requestOptions, function(err, res, payload) {
        
        if (err) {
            return reply(err);
        }
        
        if (res.statusCode > 299) {
            var error = JSON.parse(payload);
            return reply(Boom.unauthorized(error.error.message));
        }
        internals.options.validateFunc(payload, accessToken, reply, request);
    });
};

internals.authenticateWithPayload = function(request, reply) {

    var accessToken;
    if (request.query && request.query[internals.options.accessTokenKeyName]) {
        accessToken = request.query[internals.options.accessTokenKeyName];
    }

    if (!accessToken && request.payload && request.payload[internals.options.accessTokenKeyName]) {
        accessToken = request.payload[internals.options.accessTokenKeyName];
    }

    if (!accessToken) {
        return reply(Boom.unauthorized('No access token specified', 'access-token'));
    }

    return Wreck.get(internals.options.profileUrl + encodeURIComponent(accessToken), internals.options.requestOptions, function(err, res, payload) {
        if (err) {
            return reply(err);
        }
        
        if (res.statusCode > 299) {
            var error = JSON.parse(payload);
            return reply(Boom.unauthorized(error.error.message));
        }

        return internals.options.validateFunc(payload, accessToken, reply, request);
    });
};
