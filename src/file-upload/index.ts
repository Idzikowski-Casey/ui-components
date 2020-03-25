/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import './main.styl';
import {Component} from 'react';
import h from 'react-hyperscript';
import {Tag} from '@blueprintjs/core';
import Dropzone from 'react-dropzone';
import classNames from 'classnames';

const FileListItem = function(props){
  const {file} = props;
  return h(Tag, {icon: 'document'}, file.name);
};

const FileList = function(props){
  let {files, placeholder} = props;
  if (placeholder == null) { placeholder = "Choose file..."; }
  if ((files == null) || !(files.length > 0)) { return placeholder; }
  return h('div.files', files.map(file => h(FileListItem, {file})));
};

class FileUploadComponent extends Component {
  static initClass() {
    /*
    An elaboration of the file upload component
    from BlueprintJS with file drop zone capability
    */
    this.defaultProps = {
      onAddFile() {},
      onCancel() {}
    };
  }
  constructor(props) {
    super(props);
    this.renderDropzone = this.renderDropzone.bind(this);
  }

  renderDropzone({getRootProps, getInputProps, isDragActive}){
    const {files} = this.props;
    const rootProps = getRootProps();
    const className = classNames('file-upload', {'dropzone-active': isDragActive});
    const inputProps = getInputProps();
    inputProps.style = {};
    inputProps.className = 'bp3-large';
    let msg = 'Drop files here';
    if (!isDragActive) {
      msg += ", or click to upload";
    }

    return h('div', {className, ...rootProps}, [
      h('label.bp3-file-input.bp3-large', [
        h('input', inputProps),
        h('div.bp3-file-upload-input', [
          h(FileList, {files, placeholder: msg})
        ])
      ])
    ]);
  }

  render() {
    return h(Dropzone, {
      onDrop: this.props.onAddFile,
      onFileDialogCancel: this.props.onCancel
    }, this.renderDropzone);
  }
}
FileUploadComponent.initClass();

export {FileUploadComponent};
