import { Role } from "../modules/auth/auth.types";

declare global {
	namespace Express {
		interface User {
			id: string;
			role: Role;
			[key: string]: any;
		}
		interface Request {
			user?: User;
		}
	}
}
