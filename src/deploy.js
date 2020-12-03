'use strict';
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const ora = require('ora');
const {NodeSSH}  = require('node-ssh');
const archiver = require('archiver');  		//压缩工具包
const { successLog, errorLog, underlineLog } = require('../utils/index');
const deployConfig =  getCustomConfig('.deploy.config.js')
const projectDir = process.cwd(); //当前工作目录
let ssh = new NodeSSH();  //生成ssh实例

async function deploy(config) {
	const { script,
		targetDir, //服务器web目录
		distPath, projectName } = config;
	try {
		execBuild(script);        //执行打包脚本
		await startZip(distPath,projectName);
		await connectSSH(config);
		await uploadFile(targetDir,projectName);
		await unzipFile(targetDir,projectName);
		await restartNginx();
		await deleteLocalZip(projectName,projectName);
		successLog(`\n 项目${underlineLog(projectName)}成功部署`);
		process.exit(1);
	} catch(err) {
		errorLog(`部署失败${err}`);
		process.exit(1);
	}
}

function execBuild(script) {
	try {
		console.log(`\n (1) ${script}`);
		const spinner = ora('正在打包中。。。。'); 
		spinner.start();
		console.log();
		childProcess.execSync(script, { cwd: projectDir });
		spinner.stop();
		successLog('打包成功');
	} catch (err) {
		errorLog(1);
		process.exit(1);
	}
}
function startZip(distPath, projectName) {
	console.log(projectName)
	return new Promise((resolve, reject) => {
		distPath = path.resolve(projectDir, distPath);
		console.log('(2)开始压缩本地包');
		const archive = archiver('zip', {
		  zlib: { level: 9 },
		}).on('error', err => {
		  throw err;
		});
		const output = fs.createWriteStream(`${projectDir}/${projectName}.zip`);
		output.on('close', err => {
		  if (err) {
			errorLog(`  关闭archiver异常 ${err}`);
			reject(err);
			process.exit(1);
		  }
		  successLog('  zip打包成功');
		  resolve();
		});
		archive.pipe(output);
		archive.directory(distPath, '/');
		archive.finalize();
	  });
}
async function connectSSH(config) {
	console.log('(3)开始链接服务器');
	const { host, port, username, password } = config;
	const sshConfig = {
		host,port,username,password
	};
	try {
		console.log(`链接${underlineLog(host)}`);
		await ssh.connect(sshConfig);
		successLog('SSH  链接成功');
	} catch (err) {
		errorLog(`链接失败${err}`);
		process.exit(1);
	}
}

async function uploadFile(targetDir,projectName) {
	try {
		console.log(`(4)上传zip目录至${underlineLog(targetDir)}`);
		await ssh.putFile(`${projectDir}/${projectName}.zip`, `${targetDir}/${projectName}.zip`);
		successLog('zip包上传成功');
	} catch (err) {
		errorLog(`zip包上传失败 ${err}`);
		process.exit(1);
	}
}
async function runCommand(command, targetDir) {
	await ssh.execCommand(command,{cwd:targetDir});
}

async function unzipFile(targetDir,projectName) {
	try {
		console.log(`(5)开始解压zip包`);
		await runCommand(`cd ${targetDir}`, targetDir);
		await runCommand(`unzip -o -d ${targetDir} ${projectName}.zip && rm -rf ${projectName}.zip`, targetDir);
		successLog('  zip包解压成功');
	} catch (err) { 
		errorLog(`  zip包解压失败 ${err}`);
		process.exit(1);
	}
}
async function restartNginx() {
	try {
		console.log(`(6) 重新启动nginx`);
		await runCommand(`nginx -s reload`);
		successLog('nginx 重启成功');
	} catch (err) {
		errorLog(`nginx重启失败${err}`);
		process.exit(1);
	}
}
async function deleteLocalZip(projectName) {
	return new Promise((resolve, reject) => {
	  console.log('(7)开始删除本地zip包');
	  fs.unlink(`${projectDir}/${projectName}.zip`, err => {
		if (err) {
		  errorLog(`  本地zip包删除失败 ${err}`, err);
		  reject(err);
		  process.exit(1);
		}
		successLog('本地zip包删除成功\n');
		resolve();
	  });
	});
}

/**
 * 获取配置文件
 * @param {string} fileName 
 */
function getCustomConfig(fileName) {
	try {
	  let configPath = path.resolve(fileName);
	  return require(configPath);
	} catch (e) {
	}
}
deploy(deployConfig)
