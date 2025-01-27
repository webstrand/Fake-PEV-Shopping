import * as express from 'express';
import { Router as IRouter, Request, Response, NextFunction } from 'express-serve-static-core';
import getLogger from '../../../utils/logger';
import { authMiddlewareFn as authMiddleware } from '../features/auth';
import { saveToDB, getFromDB, updateOneModelInDB } from '../../database/database-index';
import type { IUserRole } from '../../database/models/_userRole';
import { HTTP_STATUS_CODE } from '../../types';
import getMiddlewareErrorHandler from '../helpers/middleware-error-handler';
import { wrapRes } from '../helpers/middleware-response-wrapper';
import { IModel } from '../../database/models/models-index';

type TMiddlewareFn = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

// @ts-ignore
const { Router } = express.default;
const logger = getLogger(module.filename);
const router: IRouter &
  Partial<{
    _saveUserRole: TMiddlewareFn;
    _updateUserRole: TMiddlewareFn;
    _getUserRole: TMiddlewareFn;
  }> = Router();

// @ts-ignore
router.post('/api/user-roles', authMiddleware(getFromDB), saveUserRole);
// @ts-ignore
router.patch('/api/user-roles', authMiddleware(getFromDB), updateUserRole);
// @ts-ignore
router.get('/api/user-roles/:roleName', authMiddleware(getFromDB), getUserRole);
router.use(getMiddlewareErrorHandler(logger));

// expose functions for unit tests
router._saveUserRole = saveUserRole;
router._updateUserRole = updateUserRole;
router._getUserRole = getUserRole;

export default router;

async function saveUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    logger.log('(saveUserRole) /user-roles:', req.body);

    if (!req.body) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, { error: 'Request body is empty or not attached!' });
    } else if (!req.body.roleName) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, {
        error: 'Param "roleName" is empty or not attached!',
      });
    } else if (!req.body.permissions) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, {
        error: 'Param "permissions" is empty or not attached!',
      });
    }

    const userRole = {
      roleName: req.body.roleName,
      permissions: req.body.permissions,
    };
    logger.log('userRole: ', userRole);

    const savedUserRole = (await saveToDB(userRole, 'User-Role')) as IUserRole;
    await savedUserRole.save();

    logger.log('savedUserRole:', savedUserRole);

    return wrapRes(res, HTTP_STATUS_CODE.OK, {
      payload: savedUserRole as Record<keyof IUserRole, IUserRole[keyof IUserRole]>,
    });
  } catch (exception) {
    return next(exception);
  }
}

async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    logger.log('(updateUserRole) /user-roles:', req.body);

    if (!req.body) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, { error: 'Request body is empty or not attached!' });
    } else if (!req.body.roleName) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, {
        error: 'Param "roleName" is empty or not attached!',
      });
    } else if (!req.body.permissions) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, {
        error: 'Param "permissions" is empty or not attached!',
      });
    }

    const updatedUserRole = await updateOneModelInDB(
      { roleName: req.body.roleName },
      req.body.permissions,
      'User-Role'
    );
    logger.log('updatedUserRole:', updatedUserRole);

    if (!updatedUserRole) {
      return wrapRes(res, HTTP_STATUS_CODE.NOT_FOUND, {
        error: `Role '${req.body.roleName}' could not be updated, because was not found!`,
      });
    }

    return wrapRes(res, HTTP_STATUS_CODE.OK, {
      payload: updatedUserRole as Record<keyof IModel, IModel[keyof IModel]>,
    });
  } catch (exception) {
    return next(exception);
  }
}

async function getUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    logger.log('(getUserRole) /user-roles:', req.params);

    if (!req.params || !req.params.roleName) {
      return wrapRes(res, HTTP_STATUS_CODE.BAD_REQUEST, {
        error: 'Param "roleName" is empty or not attached!',
      });
    }

    const userRole = (await getFromDB({ roleName: req.params.roleName }, 'User-Role')) as IUserRole;

    if (!userRole) {
      return wrapRes(res, HTTP_STATUS_CODE.NOT_FOUND, { error: `Role '${req.params.roleName}' not found!` });
    }

    await userRole.populate('owners').execPopulate();

    return wrapRes(res, HTTP_STATUS_CODE.OK, {
      payload: userRole as Record<keyof IUserRole, IUserRole[keyof IUserRole]>,
    });
  } catch (exception) {
    return next(exception);
  }
}
