import { useState } from "react";
import { useListRequests, useGetOverviewStats, HelpRequestCategory } from "@workspace/api-client-react";
import { RequestCard, CATEGORY_LABELS } from "@/components/request-card";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Using the generated images
import foodImg from "@/assets/images/food.png";
import medicineImg from "@/assets/images/medicine.png";
import clothesImg from "@/assets/images/clothes.png";
import rentImg from "@/assets/images/rent.png";

const CATEGORY_IMAGES: Partial<Record<HelpRequestCategory, string>> = {
  food: foodImg,
  medicine: medicineImg,
  clothes: clothesImg,
  rent: rentImg,
};

export default function Home() {
  const [city, setCity] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<HelpRequestCategory | undefined>(undefined);

  const { data: stats, isLoading: isLoadingStats } = useGetOverviewStats();
  const { data: requests, isLoading: isLoadingRequests } = useListRequests({
    status: "approved",
    city,
    category,
  });

  const categories: HelpRequestCategory[] = ["food", "medicine", "clothes", "rent", "other"];
  const cities = ["الرياض", "جدة", "مكة", "المدينة", "الدمام", "الطائف"]; // Simple static list for now

  return (
    <div className="space-y-10">
        {/* Hero Section */}
        <section className="relative rounded-2xl bg-primary/5 px-6 py-12 md:py-20 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              الجار للجار، <span className="text-primary">أقرب</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              منصة تواصل مجتمعية تتيح لك طلب المساعدة أو تقديمها لمن هم في أمس الحاجة في مدينتك. بكل كرامة وخصوصية.
            </p>
            
            {!isLoadingStats && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
                <div className="flex flex-col p-4 bg-background rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-primary">{stats.totalApprovedRequests}</span>
                  <span className="text-xs text-muted-foreground mt-1">حالة تنتظر المساعدة</span>
                </div>
                <div className="flex flex-col p-4 bg-background rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-chart-2">{stats.totalFulfilledRequests}</span>
                  <span className="text-xs text-muted-foreground mt-1">حالة تمت مساعدتها</span>
                </div>
                <div className="flex flex-col p-4 bg-background rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-chart-3">{stats.totalHelpers}</span>
                  <span className="text-xs text-muted-foreground mt-1">فاعل خير</span>
                </div>
                <div className="flex flex-col p-4 bg-background rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-chart-4">{stats.totalCities}</span>
                  <span className="text-xs text-muted-foreground mt-1">مدينة مغطاة</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h2 className="text-2xl font-bold">الحالات المتاحة</h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Select value={city ?? "all"} onValueChange={(val) => setCity(val === "all" ? undefined : val)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المدن</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={category === undefined ? "default" : "outline"}
              className="cursor-pointer text-sm py-1.5 px-4"
              onClick={() => setCategory(undefined)}
            >
              الكل
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className="cursor-pointer text-sm py-1.5 px-4"
                onClick={() => setCategory(category === cat ? undefined : cat)}
              >
                {CATEGORY_LABELS[cat]}
              </Badge>
            ))}
          </div>

          {/* Image Category Highlights (Desktop only) */}
          {!category && (
             <div className="hidden md:grid grid-cols-4 gap-4 pb-6">
               {(["food", "medicine", "clothes", "rent"] as HelpRequestCategory[]).map((cat) => (
                 <div key={cat} className="relative rounded-xl overflow-hidden aspect-video group cursor-pointer" onClick={() => setCategory(cat)}>
                   <img src={CATEGORY_IMAGES[cat]} alt={CATEGORY_LABELS[cat]} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                     <span className="text-white font-bold text-xl">{CATEGORY_LABELS[cat]}</span>
                   </div>
                 </div>
               ))}
             </div>
          )}

          {/* Feed */}
          {isLoadingRequests ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests?.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
              <h3 className="text-lg font-medium text-muted-foreground">لا توجد حالات حالياً</h3>
              <p className="text-sm text-muted-foreground mt-2">عد لاحقاً أو غيّر فلاتر البحث</p>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {requests?.map((request) => (
                <motion.div 
                  key={request.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                >
                  <RequestCard request={request} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
  );
}
