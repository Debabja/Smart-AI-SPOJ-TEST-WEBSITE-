const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false }));
  const Test = mongoose.model('Test', new mongoose.Schema({}, { strict: false }));
  const Room = mongoose.model('Room', new mongoose.Schema({}, { strict: false }));
  const QuestionSet = mongoose.model('QuestionSet', new mongoose.Schema({}, { strict: false }));
  const Question = mongoose.model('Question', new mongoose.Schema({}, { strict: false }));
  
  const c = await Candidate.findOne({ email: 'abhidas@gmail.com' });
  const aiSet = await QuestionSet.findOne({ testType: 'AI_TEST' });
  const test = await Test.findById('6a982f914ed4d078651b7ff4');
  test.questionSetId = aiSet._id;
  await test.save();

  const room = await Room.findOne({ testId: test._id }).lean();
  const questions = await Question.find({ testType: 'AI_TEST' }).lean();
  
  const token = jwt.sign({ id: c._id, email: c.email, role: 'candidate' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  
  console.log('SESSION_JSON_START');
  console.log(JSON.stringify({
    user: { id: c._id, name: c.name, email: c.email, type: 'candidate' },
    token: token,
    testSession: {
      test: test.toObject(),
      room: room,
      questions: questions,
      submissions: [],
      candidateStartTime: new Date().toISOString(),
      candidateEndTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    }
  }));
  console.log('SESSION_JSON_END');

  await mongoose.disconnect();
}
run().catch(console.error);
