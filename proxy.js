/**
 * Created by peter on 2016/8/1.
 * require node version 6+
 */
var http = require("http");
var url = require("url");
var net = require("net");
var http2 = require("spdy");
var deprecatedHeaders = ['connection', 'host', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade'];
var proxy = function (httpsConfig, port) {//httpsConfig should contains 'key' and 'cert'
    http2.createServer(httpsConfig).on('request', function (req, resp) {
        try {
            console.log(req.headers.host + req.url);
            var options = {
                host: req.headers.host,
                port: req.port,
                method: req.method,
                path: req.url,
                headers: req.headers
            };
            var proxyReq = http.request(options, function (proxyResp) {
                deprecatedHeaders.forEach(function (header) {
                    if (proxyResp.headers.hasOwnProperty(header)) {
                        delete proxyResp.headers[header];
                    }
                });
                resp.writeHead(proxyResp.statusCode, proxyResp.headers);
                proxyResp.pipe(resp)
            }).on('error', function (e) {
                console.log(e);
                resp.end()
            });
            req.pipe(proxyReq);
        } catch (e) {
            console.log(e);
        }
    }).on('connect', function (req, socket) {
        try {
            var requestOptions = {
                host: req.headers.host.split(':')[0],
                port: req.headers.host.split(':')[1] || 443
            };
            console.log(requestOptions.host);
            if (!socket._handle._spdyState) {
                return;
            }
            var tunnel = net.createConnection(requestOptions, function (resp) {
                socket._handle._spdyState.stream.respond(200, {});
                tunnel.pipe(socket);
                socket.pipe(tunnel);
            });
            tunnel.setNoDelay(true);
            tunnel.on('error', function (e) {
                console.log("Tunnel error: ".red + e);
                socket._handle._spdyState.stream.respond(502, {});
                socket.end();
            });
        } catch (e) {
            console.log(e);
        }
    }).listen(port, function (err) {
        if (err) {
            console.log(err);
        }
    });
};

module.exports = proxy;


