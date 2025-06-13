const Joi = require('joi');

// Schema for creating a blog
const createBlogSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().allow('', null),
  tags: Joi.array().items(Joi.string()).optional(),
  body: Joi.string().min(10).required(),
  state: Joi.string().valid('draft', 'published')
});

// Schema for updating a blog
const updateBlogSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  body: Joi.string().min(10).optional(),
  state: Joi.string().valid('draft', 'published')
}).min(1); // Ensure at least one field is being updated

// Schema for getting my blog
const getMyBlogsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  state: Joi.string().valid('draft', 'published').optional()
});


module.exports = {
  createBlogSchema,
  updateBlogSchema,
  getMyBlogsSchema
};
