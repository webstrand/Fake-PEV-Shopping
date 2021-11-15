import type {DeleteWriteOpResultObject} from 'mongodb'; // <-- this makes that file a module according to SO: https://stackoverflow.com/a/66768386/4983840

declare module "mongoose" {
    interface Document {
        save(): Promise<this>;
    }

    interface Model<T extends Document, QueryHelpers = {}> {
        find(conditions: FilterQuery<unknown>, projection?: any | null): DocumentQuery<T[], T, QueryHelpers> & QueryHelpers;
        findOne(conditions?: FilterQuery<unknown>): DocumentQuery<T | null, T, QueryHelpers> & QueryHelpers;
        deleteOne(conditions: FilterQuery<unknown>): Query<DeleteWriteOpResultObject['result'] & { deletedCount?: number }> & QueryHelpers;
    }
}