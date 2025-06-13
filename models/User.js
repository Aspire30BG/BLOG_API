const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  first_name: { 
    type: String, 
    required: true 
},
  last_name:  { 
    type: String, 
    required: true 
},
  email:      { 
    type: String, 
    required: true, 
    unique: true 
},
  password:   { 
    type: String, 
    required: true },
}, 
{ timestamps: true }
);


userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
