const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    highestTowerHeight: { type: Number, default: 0 },
    fastestWin: { type: Number, default: 0 },
    rank: { type: Number, default: 0 }
  },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  inventory: [{
    itemId: { type: String },
    quantity: { type: Number, default: 1 },
    acquired: { type: Date, default: Date.now }
  }],
  settings: {
    notifications: { type: Boolean, default: true },
    soundEffects: { type: Boolean, default: true },
    music: { type: Boolean, default: true },
    language: { type: String, default: 'en' }
  },
  lastLogin: { type: Date },
  isAdmin: { type: Boolean, default: false }
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to return user without password
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', UserSchema);
