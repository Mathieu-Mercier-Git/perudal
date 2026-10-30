import { configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

// fetch, Headers, Request, Response, TextEncoder et TextDecoder sont fournis par
// tests/jsdomEnvironment.js (APIs natives de Node 18)

configure({ adapter: new Adapter() });
