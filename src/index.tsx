import * as React from 'react';
import ReactDOM from 'react-dom';
import { setConfig } from 'react-hot-loader';
import Canvas from './components/Canvas/Canvas';

import './index.scss';

setConfig({
	errorReporter: () => null,
	ErrorOverlay: () => null,
});

const rootEl = document.getElementById('root');

ReactDOM.render(
	<Canvas />,
	rootEl
);
