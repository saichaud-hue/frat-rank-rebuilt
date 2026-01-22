import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminParties } from "@/components/admin/AdminParties";
import { AdminComments } from "@/components/admin/AdminComments";
import { AdminPosts } from "@/components/admin/AdminPosts";
import { AdminOffenders } from "@/components/admin/AdminOffenders";
import { AdminSemesterReset } from "@/components/admin/AdminSemesterReset";
import { AdminSeeding } from "@/components/admin/AdminSeeding";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { ChevronLeft, Shield, RefreshCw, AlertTriangle, RotateCcw, Sparkles, MessageSquare, Calendar, FileText, Flag, History, Users } from "lucide-react";
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
            <Tabs defaultValue="reports" className="w-full">
              <div className="space-y-2 mb-4">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="reports" className="text-xs gap-1">
                    <Flag className="h-3 w-3" />
                    Reports
                  </TabsTrigger>
                  <TabsTrigger value="parties" className="text-xs gap-1">
                    <Calendar className="h-3 w-3" />
                    Parties
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger value="posts" className="text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    Posts
                  </TabsTrigger>
                </TabsList>
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="offenders" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Offenders
                  </TabsTrigger>
                  <TabsTrigger value="users" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs gap-1">
                    <History className="h-3 w-3" />
                    Logs
                  </TabsTrigger>
                  <TabsTrigger value="seed" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    Seed
                  </TabsTrigger>
                  <TabsTrigger value="reset" className="text-xs gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="reports" className="mt-4">
                <AdminReports />
              </TabsContent>

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

              <TabsContent value="users" className="mt-4">
                <AdminUsers />
              </TabsContent>

              <TabsContent value="logs" className="mt-4">
                <AdminAuditLogs />
              </TabsContent>

              <TabsContent value="seed" className="mt-4">
                <AdminSeeding />
              </TabsContent>

              <TabsContent value="reset" className="mt-4">
                <AdminSemesterReset />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
