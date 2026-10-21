import { Badge } from '@/components/ui/badge';
import { m } from '@/locale/paraglide/messages';
import { cn } from '@/lib/utils';
interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'available' | 'planned';
}
export function Roadmap() {
  const columnTitles = {
    backlog: m.roadmap_columns_backlog(),
    inProgress: m.roadmap_columns_in_progress(),
    done: m.roadmap_columns_done(),
  };
  const columns = {
    backlog: [
      {
        id: '1',
        title: m.roadmap_board_tasks_backlog_0_title(),
        priority: 'medium',
        status: 'planned',
      },
      {
        id: '2',
        title: m.roadmap_board_tasks_backlog_1_title(),
        priority: 'medium',
        status: 'planned',
      },
      {
        id: '3',
        title: m.roadmap_board_tasks_backlog_2_title(),
        priority: 'low',
        status: 'planned',
      },
    ],
    inProgress: [
      {
        id: '4',
        title: m.roadmap_board_tasks_in_progress_0_title(),
        priority: 'medium',
        status: 'planned',
      },
      {
        id: '5',
        title: m.roadmap_board_tasks_in_progress_1_title(),
        priority: 'medium',
        status: 'planned',
      },
    ],
    done: [
      {
        id: '7',
        title: m.roadmap_board_tasks_done_0_title(),
        priority: 'high',
        status: 'available',
      },
      {
        id: '8',
        title: m.roadmap_board_tasks_done_1_title(),
        priority: 'low',
        status: 'available',
      },
    ],
  } satisfies Record<string, Task[]>;
  return (
    <div className="grid w-full auto-rows-auto grid-cols-1 gap-4 md:grid-cols-2 md:auto-rows-fr lg:grid-cols-3">
      {Object.entries(columns).map(([columnValue, tasks]) => (
        <TaskColumn
          key={columnValue}
          value={columnValue}
          tasks={tasks}
          title={
            columnTitles[columnValue as keyof typeof columnTitles] ??
            columnValue
          }
        />
      ))}
    </div>
  );
}
interface TaskCardProps {
  task: Task;
}
function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="line-clamp-1 font-medium text-sm">{task.title}</span>
          <Badge
            variant="outline"
            className={cn(
              'pointer-events-none h-5 rounded-sm border-transparent px-1.5 text-[11px]',
              task.status === 'available'
                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
            )}
          >
            {task.status === 'available'
              ? m.roadmap_board_status_available()
              : m.roadmap_board_status_planned()}
          </Badge>
        </div>
      </div>
    </div>
  );
}
interface TaskColumnProps {
  value: string;
  tasks: Task[];
  title: string;
}
function TaskColumn({ value, tasks, title }: TaskColumnProps) {
  return (
    <div key={value} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="pointer-events-none rounded-sm">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-0.5">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
