const express = require('express');
const { getTokens, getHealth } = require('../controllers/tokenController');

const router = express.Router();

router.get('/tokens', getTokens);
router.get('/health', getHealth);

module.exports = router;
