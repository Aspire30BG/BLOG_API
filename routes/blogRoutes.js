const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const blogController = require('../controllers/blogController') 
const { createBlogSchema, updateBlogSchema, getMyBlogsSchema } = require('../validators/blogValidator');
const validateRequest = require('../middlewares/validateRequest');
const validateQuery = require('../middlewares/validateQuery');

// Public
router.get('/published', blogController.getAllPublishedBlogs);
router.get('/published/:id', blogController.getOnePublishedBlog);

// Authenticated
router.post('/', auth, validateRequest(createBlogSchema), blogController.createBlog);
router.get('/my-blogs', auth, validateQuery(getMyBlogsSchema), blogController.getMyBlogs);
router.put('/:id', auth, validateRequest(updateBlogSchema), blogController.updateBlog);
router.delete('/:id', auth, blogController.deleteBlog);
router.patch('/:id/publish', auth, blogController.publishBlog);

module.exports = router;