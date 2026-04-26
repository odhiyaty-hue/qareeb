import { Link } from "wouter";
import { HelpRequest, HelpRequestCategory, HelpRequestUrgency } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MapPin, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const CATEGORY_LABELS: Record<HelpRequestCategory, string> = {
  food: "طعام",
  medicine: "دواء",
  clothes: "ملابس",
  rent: "إيجار",
  other: "أخرى",
};

export const CATEGORY_COLORS: Record<HelpRequestCategory, string> = {
  food: "bg-chart-2 text-primary-foreground hover:bg-chart-2/90",
  medicine: "bg-chart-3 text-primary-foreground hover:bg-chart-3/90",
  clothes: "bg-chart-4 text-primary-foreground hover:bg-chart-4/90",
  rent: "bg-chart-5 text-primary-foreground hover:bg-chart-5/90",
  other: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export const URGENCY_LABELS: Record<HelpRequestUrgency, string> = {
  low: "عادي",
  medium: "مهم",
  high: "عاجل",
};

export const URGENCY_COLORS: Record<HelpRequestUrgency, string> = {
  low: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  medium: "bg-accent text-accent-foreground hover:bg-accent/80",
  high: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
};

interface RequestCardProps {
  request: HelpRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md border-border/50 hover:border-border">
      <CardHeader className="p-4 pb-2 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <Badge className={`font-normal ${CATEGORY_COLORS[request.category]}`}>
            {CATEGORY_LABELS[request.category]}
          </Badge>
          <Badge variant="outline" className={`font-normal border-none ${URGENCY_COLORS[request.urgency]}`}>
            {URGENCY_LABELS[request.urgency]}
          </Badge>
        </div>
        <h3 className="font-bold text-lg leading-tight line-clamp-2">
          {request.title}
        </h3>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {request.description}
        </p>
        
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-auto pt-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{request.city}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ar })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{request.helpersCount} بادروا للمساعدة</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Link 
          href={`/requests/${request.id}`} 
          className="w-full inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          أريد المساعدة
        </Link>
      </CardFooter>
    </Card>
  );
}
