var Domain = require('domain');
var Lab = require('lab');
var Hapi = require('hapi');

// Test shortcuts
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;

describe('Access Token', function() {

    it('sets the access token key name and profile url', function(done) { 
        var server = new Hapi.Server();
        server.pack.register(require('../'), function (err) {
            server.auth.strategy('access-token', 'access-token', {
                accessTokenKeyName: 'fishface',
                profileUrl: 'http://www.google.co.uk/?access_token=',
                validateFunc: function(payload, accessToken, reply) {
                    expect(accessToken).to.equal('barry');
                    done();
                }
            });

            server.route({ method: 'GET', path: '/', config: {
                auth: 'access-token',
                handler: function(request, reply) {
                    reply(null, {credentials: request.auth.credentials});
                }
            }});

            server.inject({url:'/?fishface=barry'}, function(res) {});
        });
    });

    it('sets the user credentials for the request', function(done) { 
        var server = new Hapi.Server();
        server.pack.register(require('../'), function (err) {
            server.auth.strategy('access-token', 'access-token', {
                accessTokenKeyName: 'fishface',
                profileUrl: 'http://www.google.co.uk/?access_token=',
                validateFunc: function(payload, accessToken, reply) {
                    reply(null, { 
                        credentials: {
                            name: 'Barry White',
                            age: 24
                        }
                    })
                }
            });

            server.route({ method: 'GET', path: '/', config: {
                auth: 'access-token',
                handler: function(request, reply) {
                    expect(request.auth.credentials).to.exist;
                    expect(request.auth.credentials.name).to.exist;
                    expect(request.auth.credentials.name).to.equal('Barry White');
                    expect(request.auth.credentials.age).to.equal(24);
                    done();
                }
            }});

            server.inject({url:'/?fishface=barry'}, function(res) {});
        });
    });

});
