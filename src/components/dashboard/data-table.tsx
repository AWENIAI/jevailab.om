import * as React from 'react';
import { m } from '@/locale/paraglide/messages';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { toast } from 'sonner';
import { z } from 'zod';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IconCircleCheckFilled,
  IconLoader,
  IconDotsVertical,
  IconLayoutColumns,
  IconChevronDown,
  IconPlus,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconTrendingUp,
} from '@tabler/icons-react';

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
});

type DashboardRow = z.infer<typeof schema>;

const dashboardHeaderMessages: Record<number, () => string> = {
  1: m.dashboard_data_header_1,
  2: m.dashboard_data_header_2,
  3: m.dashboard_data_header_3,
  4: m.dashboard_data_header_4,
  5: m.dashboard_data_header_5,
  6: m.dashboard_data_header_6,
  7: m.dashboard_data_header_7,
  8: m.dashboard_data_header_8,
  9: m.dashboard_data_header_9,
  10: m.dashboard_data_header_10,
  11: m.dashboard_data_header_11,
  12: m.dashboard_data_header_12,
  13: m.dashboard_data_header_13,
  14: m.dashboard_data_header_14,
  15: m.dashboard_data_header_15,
  16: m.dashboard_data_header_16,
  17: m.dashboard_data_header_17,
  18: m.dashboard_data_header_18,
  19: m.dashboard_data_header_19,
  20: m.dashboard_data_header_20,
  21: m.dashboard_data_header_21,
  22: m.dashboard_data_header_22,
  23: m.dashboard_data_header_23,
  24: m.dashboard_data_header_24,
  25: m.dashboard_data_header_25,
  26: m.dashboard_data_header_26,
  27: m.dashboard_data_header_27,
  28: m.dashboard_data_header_28,
  29: m.dashboard_data_header_29,
  30: m.dashboard_data_header_30,
  31: m.dashboard_data_header_31,
  32: m.dashboard_data_header_32,
  33: m.dashboard_data_header_33,
  34: m.dashboard_data_header_34,
  35: m.dashboard_data_header_35,
  36: m.dashboard_data_header_36,
  37: m.dashboard_data_header_37,
  38: m.dashboard_data_header_38,
  39: m.dashboard_data_header_39,
  40: m.dashboard_data_header_40,
  41: m.dashboard_data_header_41,
  42: m.dashboard_data_header_42,
  43: m.dashboard_data_header_43,
  44: m.dashboard_data_header_44,
  45: m.dashboard_data_header_45,
  46: m.dashboard_data_header_46,
  47: m.dashboard_data_header_47,
  48: m.dashboard_data_header_48,
  49: m.dashboard_data_header_49,
  50: m.dashboard_data_header_50,
  51: m.dashboard_data_header_51,
  52: m.dashboard_data_header_52,
  53: m.dashboard_data_header_53,
  54: m.dashboard_data_header_54,
  55: m.dashboard_data_header_55,
  56: m.dashboard_data_header_56,
  57: m.dashboard_data_header_57,
  58: m.dashboard_data_header_58,
  59: m.dashboard_data_header_59,
  60: m.dashboard_data_header_60,
  61: m.dashboard_data_header_61,
  62: m.dashboard_data_header_62,
  63: m.dashboard_data_header_63,
  64: m.dashboard_data_header_64,
  65: m.dashboard_data_header_65,
  66: m.dashboard_data_header_66,
  67: m.dashboard_data_header_67,
  68: m.dashboard_data_header_68,
};

const dashboardTypeMessages: Record<string, () => string> = {
  'Cover page': m.dashboard_table_type_cover_page,
  'Table of contents': m.dashboard_table_type_table_of_contents,
  Narrative: m.dashboard_table_type_narrative,
  'Technical content': m.dashboard_table_type_technical_content,
  'Plain language': m.dashboard_table_type_plain_language,
  Legal: m.dashboard_table_type_legal,
  Visual: m.dashboard_table_type_visual,
  Financial: m.dashboard_table_type_financial,
  Research: m.dashboard_table_type_research,
  Planning: m.dashboard_table_type_planning,
};

function getDashboardHeader(item: DashboardRow) {
  return dashboardHeaderMessages[item.id]?.() ?? item.header;
}

function getDashboardType(type: string) {
  return dashboardTypeMessages[type]?.() ?? type;
}

function getDashboardStatus(status: string) {
  return status === 'Done'
    ? m.dashboard_data_status_done()
    : m.dashboard_data_status_in_process();
}

function getDashboardReviewer(reviewer: string) {
  return reviewer === 'Assign reviewer'
    ? m.dashboard_data_reviewer_unassigned()
    : reviewer;
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() &&
            !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={m.common_select_all()}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={m.common_select_row()}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'header',
    header: () => m.dashboard_table_header(),
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
  },
  {
    accessorKey: 'type',
    header: () => m.dashboard_table_section_type(),
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {getDashboardType(row.original.type)}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: () => m.dashboard_table_status(),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          'px-1.5 border-transparent',
          row.original.status === 'Done'
            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
        )}
      >
        {row.original.status === 'Done' ? (
          <IconCircleCheckFilled />
        ) : (
          <IconLoader />
        )}
        {getDashboardStatus(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: 'target',
    header: () => (
      <div className="w-full text-right">{m.dashboard_table_target()}</div>
    ),
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: m.dashboard_table_saving({
              header: getDashboardHeader(row.original),
            }),
            success: m.dashboard_table_done(),
            error: m.dashboard_table_error(),
          });
        }}
      >
        <Label htmlFor={`${row.original.id}-target`} className="sr-only">
          {m.dashboard_table_target()}
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
  },
  {
    accessorKey: 'limit',
    header: () => (
      <div className="w-full text-right">{m.dashboard_table_limit()}</div>
    ),
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: m.dashboard_table_saving({
              header: getDashboardHeader(row.original),
            }),
            success: m.dashboard_table_done(),
            error: m.dashboard_table_error(),
          });
        }}
      >
        <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
          {m.dashboard_table_limit()}
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.limit}
          id={`${row.original.id}-limit`}
        />
      </form>
    ),
  },
  {
    accessorKey: 'reviewer',
    header: () => m.dashboard_table_reviewer(),
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== 'Assign reviewer';
      if (isAssigned) {
        return getDashboardReviewer(row.original.reviewer);
      }
      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            {m.dashboard_table_reviewer()}
          </Label>
          <Select
            items={[
              { label: 'Eddie Lake', value: 'Eddie Lake' },
              { label: 'Jamik Tashpulatov', value: 'Jamik Tashpulatov' },
            ]}
          >
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-reviewer`}
            >
              <SelectValue placeholder={m.dashboard_table_assign_reviewer()} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                <SelectItem value="Jamik Tashpulatov">
                  Jamik Tashpulatov
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </>
      );
    },
  },
  {
    id: 'actions',
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="data-open:bg-muted text-muted-foreground flex size-8"
              size="icon"
            />
          }
        >
          <IconDotsVertical />
          <span className="sr-only">{m.dashboard_table_open_menu()}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>{m.dashboard_table_edit()}</DropdownMenuItem>
          <DropdownMenuItem>{m.dashboard_table_make_copy()}</DropdownMenuItem>
          <DropdownMenuItem>{m.dashboard_table_favorite()}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            {m.dashboard_table_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const [data, _setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          {m.dashboard_table_view()}
        </Label>
        <Select
          defaultValue="outline"
          items={[
            { label: m.dashboard_table_outline(), value: 'outline' },
            {
              label: m.dashboard_table_past_performance(),
              value: 'past-performance',
            },
            {
              label: m.dashboard_table_key_personnel(),
              value: 'key-personnel',
            },
            {
              label: m.dashboard_table_focus_documents(),
              value: 'focus-documents',
            },
          ]}
        >
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder={m.dashboard_table_select_view()} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="outline">
                {m.dashboard_table_outline()}
              </SelectItem>
              <SelectItem value="past-performance">
                {m.dashboard_table_past_performance()}
              </SelectItem>
              <SelectItem value="key-personnel">
                {m.dashboard_table_key_personnel()}
              </SelectItem>
              <SelectItem value="focus-documents">
                {m.dashboard_table_focus_documents()}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">
            {m.dashboard_table_outline()}
          </TabsTrigger>
          <TabsTrigger value="past-performance">
            {m.dashboard_table_past_performance()}{' '}
            <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            {m.dashboard_table_key_personnel()}{' '}
            <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">
            {m.dashboard_table_focus_documents()}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <IconLayoutColumns data-icon="inline-start" />
              {m.dashboard_table_columns()}
              <IconChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== 'undefined' &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <IconPlus />
            <span className="hidden lg:inline">
              {m.dashboard_table_add_section()}
            </span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {m.common_table_no_results()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {m.dashboard_table_selected_count({
              selected: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                {m.common_table_rows_per_page()}
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
                items={[10, 20, 30, 40, 50].map((pageSize) => ({
                  label: `${pageSize}`,
                  value: `${pageSize}`,
                }))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {m.dashboard_table_page_of({
                page: table.getState().pagination.pageIndex + 1,
                pages: table.getPageCount(),
              })}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">{m.common_table_first_page()}</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">
                  {m.common_table_previous_page()}
                </span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">{m.common_table_next_page()}</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">{m.common_table_last_page()}</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="past-performance"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}
const chartData = [
  {
    month: m.dashboard_month_january(),
    desktop: 186,
    mobile: 80,
  },
  {
    month: m.dashboard_month_february(),
    desktop: 305,
    mobile: 200,
  },
  {
    month: m.dashboard_month_march(),
    desktop: 237,
    mobile: 120,
  },
  {
    month: m.dashboard_month_april(),
    desktop: 73,
    mobile: 190,
  },
  {
    month: m.dashboard_month_may(),
    desktop: 209,
    mobile: 130,
  },
  {
    month: m.dashboard_month_june(),
    desktop: 214,
    mobile: 140,
  },
];
const chartConfig = {
  desktop: {
    label: m.dashboard_chart_desktop(),
    color: 'var(--primary)',
  },
  mobile: {
    label: m.dashboard_chart_mobile(),
    color: 'var(--primary)',
  },
} satisfies ChartConfig;
function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile();
  return (
    <Drawer swipeDirection={isMobile ? 'down' : 'right'}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="text-foreground w-fit px-0 text-left"
          />
        }
      >
        {getDashboardHeader(item)}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{getDashboardHeader(item)}</DrawerTitle>
          <DrawerDescription>
            {m.dashboard_table_showing_total_visitors()}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  {m.dashboard_table_trending_up()}{' '}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  {m.dashboard_table_showing_total_visitors()}
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">{m.dashboard_table_header()}</Label>
              <Input id="header" defaultValue={getDashboardHeader(item)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">{m.dashboard_table_section_type()}</Label>
                <Select
                  defaultValue={item.type}
                  items={[
                    {
                      label: m.dashboard_table_type_table_of_contents(),
                      value: 'Table of contents',
                    },
                    {
                      label: m.dashboard_table_type_executive_summary(),
                      value: 'Executive summary',
                    },
                    {
                      label: m.dashboard_table_type_technical_approach(),
                      value: 'Technical approach',
                    },
                    { label: m.dashboard_table_type_design(), value: 'Design' },
                    {
                      label: m.dashboard_table_type_capabilities(),
                      value: 'Capabilities',
                    },
                    {
                      label: m.dashboard_table_type_focus_documents(),
                      value: 'Focus Documents',
                    },
                    {
                      label: m.dashboard_table_type_narrative(),
                      value: 'Narrative',
                    },
                    {
                      label: m.dashboard_table_type_cover_page(),
                      value: 'Cover page',
                    },
                    {
                      label: m.dashboard_table_type_technical_content(),
                      value: 'Technical content',
                    },
                    {
                      label: m.dashboard_table_type_plain_language(),
                      value: 'Plain language',
                    },
                    { label: m.dashboard_table_type_legal(), value: 'Legal' },
                    { label: m.dashboard_table_type_visual(), value: 'Visual' },
                    {
                      label: m.dashboard_table_type_financial(),
                      value: 'Financial',
                    },
                    {
                      label: m.dashboard_table_type_research(),
                      value: 'Research',
                    },
                    {
                      label: m.dashboard_table_type_planning(),
                      value: 'Planning',
                    },
                  ]}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue
                      placeholder={m.dashboard_table_select_type()}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Table of contents">
                        {m.dashboard_table_type_table_of_contents()}
                      </SelectItem>
                      <SelectItem value="Executive summary">
                        {m.dashboard_table_type_executive_summary()}
                      </SelectItem>
                      <SelectItem value="Technical approach">
                        {m.dashboard_table_type_technical_approach()}
                      </SelectItem>
                      <SelectItem value="Design">
                        {m.dashboard_table_type_design()}
                      </SelectItem>
                      <SelectItem value="Capabilities">
                        {m.dashboard_table_type_capabilities()}
                      </SelectItem>
                      <SelectItem value="Focus Documents">
                        {m.dashboard_table_type_focus_documents()}
                      </SelectItem>
                      <SelectItem value="Narrative">
                        {m.dashboard_table_type_narrative()}
                      </SelectItem>
                      <SelectItem value="Cover page">
                        {m.dashboard_table_type_cover_page()}
                      </SelectItem>
                      <SelectItem value="Technical content">
                        {m.dashboard_table_type_technical_content()}
                      </SelectItem>
                      <SelectItem value="Plain language">
                        {m.dashboard_table_type_plain_language()}
                      </SelectItem>
                      <SelectItem value="Legal">
                        {m.dashboard_table_type_legal()}
                      </SelectItem>
                      <SelectItem value="Visual">
                        {m.dashboard_table_type_visual()}
                      </SelectItem>
                      <SelectItem value="Financial">
                        {m.dashboard_table_type_financial()}
                      </SelectItem>
                      <SelectItem value="Research">
                        {m.dashboard_table_type_research()}
                      </SelectItem>
                      <SelectItem value="Planning">
                        {m.dashboard_table_type_planning()}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">{m.dashboard_table_status()}</Label>
                <Select
                  defaultValue={item.status}
                  items={[
                    {
                      label: m.dashboard_data_status_done(),
                      value: 'Done',
                    },
                    {
                      label: m.dashboard_data_status_in_process(),
                      value: 'In Process',
                    },
                  ]}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue
                      placeholder={m.dashboard_table_select_status()}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Done">
                        {m.dashboard_data_status_done()}
                      </SelectItem>
                      <SelectItem value="In Process">
                        {m.dashboard_data_status_in_process()}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">{m.dashboard_table_target()}</Label>
                <Input id="target" defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="limit">{m.dashboard_table_limit()}</Label>
                <Input id="limit" defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="reviewer">{m.dashboard_table_reviewer()}</Label>
              <Select
                defaultValue={item.reviewer}
                items={[
                  { label: 'Eddie Lake', value: 'Eddie Lake' },
                  { label: 'Jamik Tashpulatov', value: 'Jamik Tashpulatov' },
                  { label: 'Emily Whalen', value: 'Emily Whalen' },
                ]}
              >
                <SelectTrigger id="reviewer" className="w-full">
                  <SelectValue
                    placeholder={m.dashboard_table_select_reviewer()}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                    <SelectItem value="Jamik Tashpulatov">
                      Jamik Tashpulatov
                    </SelectItem>
                    <SelectItem value="Emily Whalen">Emily Whalen</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>{m.dashboard_table_submit()}</Button>
          <DrawerClose render={<Button variant="outline" />}>
            {m.common_cancel()}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
