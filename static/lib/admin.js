/* global define, $, app, socket, bootbox */
define('admin/plugins/s3-file-uploads', ['settings'], function (Settings) {

  const ACP = {};

  ACP.init = function () {
    Settings.load('s3-file-uploads', $('#s3-upload-bucket'));
    Settings.load('s3-file-uploads', $('#s3-upload-credentials'));

    $("#s3-upload-bucket").on("submit", function (e) {
			e.preventDefault();
			Settings.save('s3-file-uploads', $('#s3-upload-bucket'), function () {
        app.alert({
          type: 'success',
          alert_id: 's3-file-uploads-saved',
          title: 'Settings Saved',
          message: 'Please reload your NodeBB to apply these settings',
          clickfn: function () {
            socket.emit('admin.restart')
          }
        })
      })
    });
    
    $("#s3-upload-credentials").on("submit", function (e) {
      e.preventDefault();
      bootbox.confirm("Are you sure you wish to store your credentials for accessing S3 in the database?", function (confirm) {
				if (confirm) {
          Settings.save('s3-file-uploads', $('#s3-upload-credentials'), function () {
            app.alert({
              type: 'success',
              alert_id: 's3-file-uploads-saved',
              title: 'Settings Saved',
              message: 'Please reload your NodeBB to apply these settings',
              clickfn: function () {
                socket.emit('admin.restart');
              }
            })
          })
				}
      });
		});
  }

  return ACP;
});