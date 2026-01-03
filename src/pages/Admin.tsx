import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminParties } from "@/components/admin/AdminParties";
import { AdminComments } from "@/components/admin/AdminComments";
import { AdminPosts } from "@/components/admin/AdminPosts";
import { AdminOffenders } from "@/components/admin/AdminOffenders";
import { ChevronLeft, Shield, RefreshCw, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    setIsRefreshing(false);
  }, [queryClient]);

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["admin"] });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Admin</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Moderation & Ops</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="parties" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="parties">Parties</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="offenders" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">Offenders</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parties" className="mt-4">
                <AdminParties />
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <AdminComments />
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                <AdminPosts />
              </TabsContent>

              <TabsContent value="offenders" className="mt-4">
                <AdminOffenders />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
