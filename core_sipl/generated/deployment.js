if (!window.SI) window.SI = {};
SI.Deployment = {
    Change: function (button) {
        const blocks = SI.Editor && SI.Editor.Data && SI.Editor.Data.Objects.Blocks;
        if (blocks && Object.values(blocks).some(block => block.IsDirty) && !confirm('Switch deployment and discard your unsaved changes?')) return;
        button.disabled = true;
        const request = SI.Tools.Ajax({Data: {KEY: 'ChangeDeployment', Deployment: button.id.replace('si_deployment_control_', '')}});
        request.addEventListener('load', function () {
            try { if (SI.Editor && JSON.parse(request.responseText)[0].REFRESH) SI.Editor.DeploymentSwitchAccepted = true; } catch (_) {}
        });
        request.addEventListener('loadend', function () { button.disabled = false; });
    }
};
