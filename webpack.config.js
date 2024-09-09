const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const webpack = require('webpack');


module.exports = {
	mode: "production",
	entry: {
		core: path.resolve(__dirname, ".", "src", "core.ts"),
		popup: path.resolve(__dirname, ".", "src", "popup.ts"),
		status: path.resolve(__dirname, ".", "src", "status.ts"),
		firebase: path.resolve(__dirname, ".", "src", "firebase.ts"),
	},
	output: {
		path: path.join(__dirname, "./dist"),
		filename: "[name].js",
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new CopyPlugin({
			patterns: [{ from: ".", to: ".", context: "public" }],
		}),
	],

	devServer: {
		hot: true,
		open: true, // Optional: opens the browser automatically
		port: 3000 // You can set your preferred port
	},
};
