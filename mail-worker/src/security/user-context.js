import JwtUtils from '../utils/jwt-utils';
import { getAuthToken } from './auth-cookie';

const userContext = {
	getUserId(c) {
		return c.get('user').userId;
	},

	getUser(c) {
		return c.get('user');
	},

	async getToken(c) {
		const jwt = getAuthToken(c);
		const result = await JwtUtils.verifyToken(c,jwt);
		return result?.sessionId;
	},
};
export default userContext;
