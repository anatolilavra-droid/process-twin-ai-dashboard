const createApp = require('./app');
const { port } = require('./config/env');

const app = createApp();

app.listen(port, () => {
  console.log(`Process Twin server listening on port ${port}`);
});
