<h1><i class="fa fa-picture-o"></i> S3 Uploads Configuration</h1>
<hr/>

<p>You can configure this plugin via a combination of the below, for instance, you can use <em>instance meta-data</em>
	and <em>environment variables</em> in combination. You can also specify values in the form below, and those will be
	stored in the database.</p>

<h3>Environment Variables</h3>
<pre><code>export AWS_ACCESS_KEY_ID="xxxxx"
export AWS_SECRET_ACCESS_KEY="yyyyy"
export S3_UPLOADS_BUCKET="zzzz"
export S3_UPLOADS_HOST="host"
export S3_UPLOADS_PATH="path"
</code></pre>

<p>
	Asset host and asset path are optional. You can leave these blank to default to the standard asset url -
	<code>http://mybucket.s3.amazonaws.com/uuid.jpg</code>.<br/>
	Asset host can be set to a custom asset host. For example, if set to <code>cdn.mywebsite.com</code> then the asset url is
	<code>http://cdn.mywebsite.com/uuid.jpg</code>.<br/>
	Asset path can be set to a custom asset path. For example, if set to <code>/assets</code>, then the asset url is
	<code>http://mybucket.s3.amazonaws.com/assets/uuid.jpg</code>.<br/>
	If both are asset host and path are set, then the url will be http://cdn.mywebsite.com/assets/uuid.jpg.
</p>

<h3>Instance meta-data</h3>
<p>This plugin is compatible with the instance meta-data API, you'll need to setup role delegation for this to work. See
	the following links:</p>
<ul>
	<li><a href="http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html">EC2 Documentation:
		Instance Metadata and User Data</a></li>
	<li><a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/roles-assume-role.html">IAM Documentation: Assuming a
		Role</a></li>
	<li><a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/role-usecase-ec2app.html">IAM Documentation: EC2 Role
		Example</a></li>
	<li><a href="http://docs.aws.amazon.com/STS/latest/UsingSTS/sts_delegate.html">STS Documentation: Delegation</a>
	</li>
</ul>
<div class="alert alert-warning">
	<p>If you need help, create an <a href="https://github.com/LewisMcMahon/nodebb-plugin-s3-uploads/issues/">issue on
		Github</a>.</p>
</div>

<h3>Database Stored configuration:</h3>
<form id="s3-upload-bucket">
	<label for="s3bucket">Bucket</label><br/>
	<input type="text" id="s3bucket" name="bucket" title="S3 Bucket" class="form-control input-lg"
	       placeholder="S3 Bucket"><br/>

	<label for="s3host">Host</label><br/>
	<input type="text" id="s3host" name="host" title="S3 Host" class="form-control input-lg"
	       placeholder="website.com"><br/>

	<label for="s3path">Path</label><br/>
	<input type="text" id="s3path" name="path" title="S3 Path" class="form-control input-lg"
	       placeholder="/assets"><br/>

	<label for="aws-region">Region</label><br/>
	<select id="aws-region" name="region" title="AWS Region" class="form-control">
		<option value="">..</option>
		<optgroup label="US">
			<option value="us-east-1">Standard (us-east-1)</option>
			<option value="us-east-2">Ohio (us-east-2)</option>
			<option value="us-west-1">N. California (us-west-1)</option>
			<option value="us-west-2">Oregon (us-west-2)</option>
		</option>
		<optgroup label="Africa">
			<option value="af-south-1">Cape Town (af-south-1)</option>
		</option>
		<optgroup label="Asia Pacific">
			<option value="ap-east-1">Hong Kong (ap-east-1)</option>
			<option value="ap-south-1">Mumbai (ap-south-1)</option>
			<option value="ap-northeast-2">Seoul (ap-northeast-2)</option>
			<option value="ap-southeast-1">Singapore (ap-southeast-1)</option>
			<option value="ap-northeast-1">Tokyo (ap-northeast-1)</option>
		</option>
		<optgroup label="Canada">
			<option value="ca-central-1">Canada (ca-central-1)</option>
		</option>
		<optgroup label="Europe">
			<option value="eu-central-1">Frankfurt (eu-central-1)</option>
			<option value="eu-west-1">Ireland (eu-west-1)</option>
			<option value="eu-west-2">London (eu-west-2)</option>
			<option value="eu-south-1">Milan (eu-south-1)</option>
			<option value="eu-west-3">Paris (eu-west-3)</option>
			<option value="eu-north-1">Stockholm (eu-north-1)</option>
		</option>
		<optgroup label="Middle East">
			<option value="me-south-1">Bahrain (me-south-1)</option>
		</option>
		<optgroup label="South America">
			<option value="sa-east-1">São Paulo (sa-east-1)</option>
		</option>
	</select>
	<br/>

	<button class="btn btn-primary" type="submit">Save</button>
</form>

<br><br>
<form id="s3-upload-credentials">
	<label for="bucket">Credentials</label><br/>
	<div class="alert alert-warning">
		Configuring this plugin using the fields below is <strong>NOT recommended</strong>, as it can be a potential
		security issue. We highly recommend that you investigate using either <strong>Environment Variables</strong> or
		<strong>Instance Meta-data</strong>
	</div>
	<input type="text" name="accessKeyId" maxlength="20" title="Access Key ID"
	       class="form-control input-lg" placeholder="Access Key ID"><br/>
	<input type="text" name="secretAccessKey" title="Secret Access Key"
	       class="form-control input-lg" placeholder="Secret Access Key"><br/>
	<button class="btn btn-primary" type="submit">Save</button>
</form>