const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: {
    vendor: ["bootstrap", "jquery", "bootstrap/dist/css/bootstrap.css"],
  },
  output: {
    path: path.join(__dirname, "public", "dist"),
    publicPath: "public/dist/",
    filename: "[name].js",
    library: "[name]_[hash]",
  },
  resolve: {
    extensions: [".js"],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({ test: /\.js(\?.*)?$/i }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(png|woff|woff2|eot|ttf|jpg|jpeg|gif|svg)$/,
        use: "url-loader?limit=10000",
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "./",
            },
          },
          "css-loader",
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
      Popper: ["popper.js", "default"],
    }),
    new webpack.DllPlugin({
      path: path.join(__dirname, "public", "dist", "[name]-manifest.json"),
      name: "[name]_[hash]",
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
  ],
};
