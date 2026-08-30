const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`Process Twin server listening on port ${port}`);
});
