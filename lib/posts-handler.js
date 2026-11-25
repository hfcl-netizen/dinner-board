'use strict';

const pug = require('pug');
const Cookies = require('cookies');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Tokyo');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });
const util = require('./handler-util');

const categories = ['和食', '洋食', '中華', 'ラーメン', 'カレー', 'その他'];
const likeCookieKey = 'liked_posts';

async function handle(req, res, url) {
  const cookies = new Cookies(req, res);
  switch (req.method) {
    case 'GET':
      const selected = url.searchParams.get('category');
      let posts;
      if (categories.includes(selected)) {
        posts = await prisma.post.findMany({
          where: { category: selected },
          orderBy: { id: 'desc' }
        });
      } else {
        posts = await prisma.post.findMany({
          orderBy: { id: 'desc' }
        });
      }
      const likedIds = getLikedIds(cookies);
      posts.forEach(post => {
        post.formattedCreatedAt = dayjs(post.createdAt).tz().format('YYYY年MM月DD日 HH時mm分');
        post.liked = likedIds.includes(post.id);
      });
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(pug.renderFile('./views/posts.pug', {
        posts,
        user: req.user,
        categories,
        selected
      }));
      console.info(
        `閲覧されました: user: ${req.user}, ` +
        `remoteAddress: ${req.socket.remoteAddress}, ` +
        `userAgent: ${req.headers['user-agent']}`
      );
      break;
    case 'POST':
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      }).on('end', async () => {
        const params = new URLSearchParams(body);
        const content = params.get('content');
        const category = params.get('category');
        // 空っぽの投稿と200文字より長い投稿はダメ
        if (!content || !content.trim() || content.length > 200 || !categories.includes(category)) {
          util.handleBadRequest(req, res);
          return;
        }
        await prisma.post.create({
          data: {
            content,
            category,
            postedBy: req.user
          }
        });
        console.info(`投稿されました: user: ${req.user}, category: ${category}`);
        handleRedirectPosts(req, res);
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleLike(req, res) {
  if (req.method !== 'POST') {
    util.handleBadRequest(req, res);
    return;
  }
  const cookies = new Cookies(req, res);
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  }).on('end', async () => {
    const id = parseInt(new URLSearchParams(body).get('id'));
    const likedIds = getLikedIds(cookies);
    // 同じ投稿に何回もいいねできないようにCookieに覚えておく
    if (id && !likedIds.includes(id)) {
      await prisma.post.updateMany({
        where: { id },
        data: { likes: { increment: 1 } }
      });
      likedIds.push(id);
      cookies.set(likeCookieKey, likedIds.join('.'), {
        maxAge: 1000 * 60 * 60 * 24 * 365
      });
    }
    handleRedirectPosts(req, res);
  });
}

function handleDelete(req, res) {
  if (req.method !== 'POST') {
    util.handleBadRequest(req, res);
    return;
  }
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  }).on('end', async () => {
    const id = parseInt(new URLSearchParams(body).get('id'));
    if (id) {
      const post = await prisma.post.findUnique({
        where: { id }
      });
      if (post && (req.user === post.postedBy || req.user === 'admin')) {
        await prisma.post.delete({
          where: { id }
        });
        console.info(`削除されました: user: ${req.user}, id: ${id}`);
      }
    }
    handleRedirectPosts(req, res);
  });
}

function getLikedIds(cookies) {
  const value = cookies.get(likeCookieKey);
  if (!value) {
    return [];
  }
  return value.split('.').map(Number);
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle,
  handleLike,
  handleDelete
};
