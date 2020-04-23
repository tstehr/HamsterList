const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(createProxyMiddleware('/api', { target: 'http://localhost:4000/', ws: true }))
  //app.use(proxy('/api/[^\\\\]+/socket', { target: 'ws://localhost:4000"' }));
}
