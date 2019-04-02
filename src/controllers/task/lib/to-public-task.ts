import {PublicTaskModel, PublicTaskModelV2, TaskModel, TaskModelV2} from '../../../types';

export default function toPublicTask(
    task: TaskModel | TaskModelV2,
): PublicTaskModel | PublicTaskModelV2 {
    return {
        id: (task._id && task._id.toHexString()) || '',
        description: task.description || '',
        name: task.name || '',
        status: task.status,
        dueDate: task.dueDate,
    };
}
