module.exports = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({ status: 'error', message: error.details[0].message });
    }
    next();
  };
};
