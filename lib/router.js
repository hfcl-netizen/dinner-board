'use strict';
const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res) {
  if (process.env.RENDER && req.headers['x-forwarded-proto'] === 'http') {
    util.handleNotFound(req, res);
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  switch (url.pathname) {
    case '/':
    case '/posts':
      postsHandler.handle(req, res, url);
      break;
    case '/posts/like':
      postsHandler.handleLike(req, res);
      break;
    case '/posts/delete':
      postsHandler.handleDelete(req, res);
      break;
    case '/logout':
      util.handleLogout(req, res);
      break;
    default:
      util.handleNotFound(req, res);
      break;
  }
}

module.exports = {
  route
};
