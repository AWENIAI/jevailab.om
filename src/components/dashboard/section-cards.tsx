import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { m } from '@/locale/paraglide/messages';

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{m.dashboard_card_total_revenue()}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $1,250.00
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
            >
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {m.dashboard_card_trending_up_this_month()}{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {m.dashboard_card_visitors_last_six_months()}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{m.dashboard_card_new_customers()}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1,234
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="border-transparent bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
            >
              <IconTrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {m.dashboard_card_down_this_period()}{' '}
            <IconTrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {m.dashboard_card_acquisition_needs_attention()}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            {m.dashboard_card_active_accounts()}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
            >
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {m.dashboard_card_strong_user_retention()}{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {m.dashboard_card_engagement_exceeds_targets()}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{m.dashboard_card_growth_rate()}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.5%
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
            >
              <IconTrendingUp />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {m.dashboard_card_steady_performance_increase()}{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {m.dashboard_card_meets_growth_projections()}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
