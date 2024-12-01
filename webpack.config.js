const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const webpack = require('webpack');


module.exports = {
	mode: "production",
	entry: {
		// scripts
		firebase: path.resolve(__dirname, ".", "src", "firebase.script.ts"),
		core: path.resolve(__dirname, ".", "src", "core.script.ts"),
		// connectors
		statusLog: path.resolve(__dirname, ".", "src", "statusLog.connector.ts"),
		changeServer: path.resolve(__dirname, ".", "src", "changeServer.connector.ts"),
		// extensions
		popup: path.resolve(__dirname, ".", "src", "popup.extension.ts"),
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
		new CopyPlugin({
			patterns: [{ from: ".", to: ".", context: "public" }],
		}),
	],
};
