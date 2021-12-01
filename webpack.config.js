const webpack = require("webpack");
const SourceMapDevToolPlugin = webpack.SourceMapDevToolPlugin;
const path = require("path");
const bundleOutputDir = "./public/dist";
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: {
    main: ["./ts/project/main.ts", "./css/site.css"],
  },
  output: {
    filename: "[name].bundle.js",
    path: path.join(__dirname, bundleOutputDir),
    publicPath: "public/dist/",
  },
  devtool: "source-map",
  resolve: {
    extensions: [".js", ".ts"],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({ test: /\.js(\?.*)?$/i }),
      new OptimizeCSSAssetsPlugin({}),
    ],
  },
  performance: {
    hints: false,
    maxEntrypointSize: 51200,
    maxAssetSize: 51200,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: ["/node_modules/"],
      },
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.css$/,
        sideEffects: true,
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
    new webpack.DllReferencePlugin({
      context: __dirname,
      manifest: require("./public/dist/vendor-manifest.json"),
    }),
  ].concat([
    new SourceMapDevToolPlugin({
      filename: "[file].map",
      moduleFilenameTemplate: path.relative(bundleOutputDir, "[resourcePath]"),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
  ]),
};
