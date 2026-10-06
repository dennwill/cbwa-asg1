const { openDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;

const app = createApp(openDatabase());

app.listen(PORT, () => {
  console.log(`HealthCoverSim API listening on http://localhost:${PORT}`);
});
