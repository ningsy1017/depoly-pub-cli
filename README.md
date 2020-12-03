This is a npm package of public web project to server!
## use
`npm install @nw/deploy-pub-cli`

### then

` add .deploy.config.js to your project at root`

### example of .deploy.config.js

```js
	module.exports = {
		script:'npm run build',   			  	//打包脚本
		name: '',                        		// 项目名称，可选项
		targetDir: '/usr/local/nginx/html/',   	// 项目部署目录名称，必须
		buildDir: 'test', 						// 打包目录名（build出来的目录），必须
		distPath:'./dist',						// 打包dist文件路径
		host: '', 					   			// 接口host，必须
		port: 22,
		username: '',
		password:'',
		rootDir: '',								// web根目录，默认 'demo.jr.jd.com/insurance/' 
	} 
```
### add deploy.js to your project at root

```js

  const deploy = require('@nw/deploy-pub-cli')
  const deployConfig =  require('./deploy.config.js')
		deploy(deployConfig)
```
### add command script in package.json 

```js
	"script":{
		"deploy":"node deploy.js"
	}
```

### last 

 `npm run deploy`

