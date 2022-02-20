const requestIp = require('request-ip');
const he = require('he');
const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');

/****** SUBMIT PHOTO ********/

const validateFile = file => {
  if(!file) {
    return false;
  }
  const fileName = file.path.split('/').slice(-1)[0];
  const fileExtension = fileName.split('.').slice(-1)[0];
  const allowedExtensions = ['png', 'jpg', 'gif'];
  const isExtAllowed = allowedExtensions.find(ext => ext === fileExtension);
  return isExtAllowed && fileName;
};

const validateString = (str, lengthAllowed) => (
  str && str.length <= lengthAllowed && !/<.*>/.test(str) && he.encode(str)
);

const validateEmail = email => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;   //simple email pattern from https://www.w3resource.com/javascript/form/email-validation.php
  const [localPart, domainPart] = email.split('@');
  return emailRegex.test(email) && localPart.length <= 64 && domainPart.length <= 255 && email;
};

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;
    const validFile = validateFile(file);
    const validTitle = validateString(title, 25);
    const validAuthor = validateString(author, 50);
    const validEmail = validateEmail(email);
    if(validTitle && validAuthor && validEmail && validFile) {
      const newPhoto = new Photo({
        title: validTitle,
        author: validAuthor,
        email: validEmail,
        src: validFile,
        votes: 0,
      });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);
    } else {
      throw new Error('Wrong input!');
    }
  } catch(err) {
    res.status(500).json({message: err.message});
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

const validateVote = async req => {
  const photoId = req.params.id;
  const clientIp = requestIp.getClientIp(req);
  const voterDoc = await Voter.findOne({ user: {$eq: clientIp} });
  if(!voterDoc) {
    const newVoter = new Voter({ user: clientIp, votes: [photoId] });
    await newVoter.save();
  } else {
    const isVoted = voterDoc.votes.find(vote => vote === photoId);
    if(isVoted) {
      throw new Error('Already voted. Next vote not allowed!');
    } else {
      voterDoc.votes.push(photoId);
      await voterDoc.save();
    }
  }
};


exports.vote = async (req, res) => {

  try {
    const photoToUpdate = await Photo.findOne({ _id: {$eq: req.params.id} });
    if(!photoToUpdate) {
      res.status(404).json({ message: 'Not found' });
    } else {
      await validateVote(req);
      photoToUpdate.votes++;
      await photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  } catch(err) {
    res.status(500).json({message: err.message});
  }
};
