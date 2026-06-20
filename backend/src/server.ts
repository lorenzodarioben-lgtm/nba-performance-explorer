import { app } from './app.js';

const defaultPort = 3001;
const configuredPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
const port = Number.isNaN(configuredPort) ? defaultPort : configuredPort;

app.listen(port, () => {
  console.log(`NBA Performance Explorer API listening on http://localhost:${port}`);
});
