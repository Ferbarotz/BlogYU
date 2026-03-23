const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js', // punto de entrada principal
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/', // para que funcione react-router
  },
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx'], // para importar sin extensión
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // transpilar js y jsx con babel
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/, // para importar css
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i, // para imágenes
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // plantilla html
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 8080,
    historyApiFallback: true, // para react-router
    allowedHosts: 'all', // permite conexiones desde Codespaces
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws', // fix WebSocket Codespaces
    },
  },
};