const path = require('path');
const express = require('express');
const xss = require('xss');
const CommentsService = require('./comments-service');

const commentsRouter = express.Router();

const serializeComment = comment => ({
  id: comment.id,
  text: xss(comment.text),
  date_commented: comment.date_commented,
  article_id: comment.article_id,
  user_id: comment.user_id
});

commentsRouter
  .route('/')
  .get(( req, res, next ) => {
    const knexInstance = req.app.get('db');
    CommentsService.getAllComments(knexInstance)
      .then( comments => {
        res.json(comments.map(serializeComment));
      })
      .catch(next);
  })
  .post(( req, res, next ) => {
    const { text, article_id, user_id, date_commented } = req.body;
    const newComment = { text, article_id, user_id };

    for (const [key, value] of Object.entries(newComment)) {
      // eslint-disable-next-line eqeqeq
      if (value == null ) {
        return res.status(400).json({
          error: { message: `Missing ${key} in request body.`}
        });
      }
    }

    newComment.date_commented = date_commented;

    CommentsService.insertComment(
      req.app.get('db'),
      newComment
    )
      .then( comment => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${comment.id}`))
          .json(serializeComment(comment));
      })
      .catch(next);
  });

commentsRouter
  .route('/:comment_id')
  .all(( req, res, next ) => {
    CommentsService.getById(
      req.app.get('db'),
      req.params.comment_id
    )
      .then( comment => {
        if (!comment) {
          return res.status(404).json({
            error: { message: 'Comment doesn\'t exist.'}
          });
        }
        res.comment = comment;
        next();
      })
      .catch(next);
  })
  .patch(( req, res, next ) => {
    const { text, date_commented } = req.body;
    const commentToUpdate = { text, date_commented };

    const numberOfValues = Object.values(commentToUpdate);
    if (numberOfValues === 0) {
      return res.status(400).json({
        // eslint-disable-next-line quotes
        error: { message: `Request body must contain either 'text' or 'date_commented'`}
      });
    }
    CommentsService.updateComment(
      req.app.get('db'),
      req.params.comment_id,
      commentToUpdate
    )
      .then( numRowsAffected => res.status(204).end() )
      .catch(next);
  });

module.exports = commentsRouter;