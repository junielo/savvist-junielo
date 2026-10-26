export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  mongodb: {
    uri: process.env['MONGODB_URI'] as string,
  },
});