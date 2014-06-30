hapi-access-token
=================

Simple third party access token login plugin for Hapi
=======
### **hapi-access-token**

**hapi-access-token** is a third-party login plugin for [hapi](https://github.com/spumko/hapi). **hapi-access-token** comes with default support for Facebook. This was built with mobile apps in mind: mobile apps generally authenticate themselves with the installed app, and they simply receive an access token for future requests on the user's behalf. 

[![Build Status](https://secure.travis-ci.org/yoitsro/hapi-access-token.png)](http://travis-ci.org/yoitsro/hapi-access-token)

### Usage

Add a login endpoint and set it to use the **hapi-access-token** authentication strategy. 

**hapi-access-token** does not maintain a session. Once the handler is called, the application must set its own session management.

```javascript
var Hapi = require('hapi');
var Boom = require('boom');
var server = new Hapi.Server(8000);

// Register bell with the server
server.pack.register(require('hapi-access-token'), function (err) {

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('hapi-access-token', 'hapi-access-token', {
        accessTokenKeyName: 'access_token', // The query parameter key you'll be specifying the access token in,
        profileUrl: 'https://graph.facebook.com/me?access_token=', // The url to get the user's profile,
        validateFunc: function(payload, accessToken, reply) { // The function which will extract the user profile and set it as the request's credentials
            try {
                var profile = JSON.parse(payload);
                var credentials = {};
                credentials.token = accessToken;
                credentials.profile = {
                    id: profile.id,
                    username: profile.username,
                    displayName: profile.name,
                    name: {
                        first: profile.first_name,
                        last: profile.last_name,
                        middle: profile.middle_name
                    },
                    email: profile.email,
                    raw: profile
                };
        
                return reply(null, {credentials: credentials});
            } catch(err) {
                return reply(Boom.unauthorized(err.toString()));
            }
        }
    });

    server.route({
        method: ['GET'], // Must handle both GET and POST
        path: '/login',          // The callback endpoint registered with the provider
        config: {
            auth: 'access-token',
            handler: function (request, reply) {

                // Perform any account lookup or registration, setup local session,
                // and redirect to the application. The third-party credentials are
                // stored in request.auth.credentials. Any query parameters from
                // the initial request are passed back via request.auth.credentials.query.
                return reply.redirect('/home');
            }
        }
    });

    server.start();
});
```

### Options

The `server.auth.strategy()` method requires the following strategy options:
- `accessTokenKeyName` - The query parameter key you'll be specifying the access token in.
- `profileUrl` - The URL where the user account can be found
- `validateFunc` - The function which will parse out the user's profile with the parameters:
  - `payload` - The response payload from the `profileUrl`
  - `accessToken` - The original access token used for this request
  - `reply` - A Hapi authorization callback with any errors as the first parameter and the `request.auth` object as the second parameter
