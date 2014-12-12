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
    validateFunc: Joi.func().required().description('The function which will parse the user profile from the response object')
});

internals.defaults = {
    accessTokenKeyName: 'access_token',
    profileUrl: 'https://graph.facebook.com/me?access_token='
};

internals.implementation = function (server, options) {
    Hoek.assert(options, internals.schema);
    internals.options = Hoek.applyToDefaults(internals.defaults, options);

    return { authenticate: internals.authenticate };
};

internals.authenticate = function(request, reply) {
    var accessToken;
    if (request.query && request.query[internals.options.accessTokenKeyName]) {
        accessToken = request.query[internals.options.accessTokenKeyName];
    }

    if (!accessToken && request.payload && request.payload[internals.options.accessTokenKeyName]) {
        accessToken = request.payload[internals.options.accessTokenKeyName];
    }

    if (!accessToken) {
        return reply(Boom.unauthorized(null, 'access-token'));
    }

    Wreck.get(internals.options.profileUrl + encodeURIComponent(accessToken), function(err, res, payload) {
        if (err) {
            return reply(err);
        }
        
        if (res.statusCode > 299) {
            var error = JSON.parse(payload);
            return reply(Boom.unauthorized(error.error.message));
        }
        internals.options.validateFunc(payload, accessToken, reply);
    });
};
