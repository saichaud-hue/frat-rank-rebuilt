import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Party = {
  id: string;
  title: string | null;
  fraternity_id: string | null;
};

type Fraternity = {
  id: string;
  name: string;
};

export function AdminSeeding() {
  const queryClient = useQueryClient();
  
  // Rating seeding state
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [ratingCount, setRatingCount] = useState("5");
  const [minScore, setMinScore] = useState("6");
  const [maxScore, setMaxScore] = useState("10");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Reputation rating seeding state
  const [selectedFrat, setSelectedFrat] = useState<string>("");
  const [repRatingCount, setRepRatingCount] = useState("5");
  const [repMinScore, setRepMinScore] = useState("6");
  const [repMaxScore, setRepMaxScore] = useState("10");
  const [repRatingLoading, setRepRatingLoading] = useState(false);

  // Post seeding state
  const [postText, setPostText] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  // AI Chat seeding state
  const [aiTopic, setAiTopic] = useState("rush week");
  const [aiPostCount, setAiPostCount] = useState("15");
  const [aiLoading, setAiLoading] = useState(false);

  // Delete state
  const [deletePartyRatingsLoading, setDeletePartyRatingsLoading] = useState(false);
  const [deleteRepRatingsLoading, setDeleteRepRatingsLoading] = useState(false);

  // Fetch parties and fraternities
  const { data } = useQuery({
    queryKey: ["admin", "seeding-data"],
    queryFn: async () => {
      const [partiesRes, fratsRes] = await Promise.all([
        supabase
          .from("parties")
          .select("id,title,fraternity_id,starts_at")
          .eq("status", "completed")
          .lt("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: false })
          .limit(50),
        supabase.from("fraternities").select("id,name").order("name"),
      ]);

      return {
        parties: (partiesRes.data ?? []) as Party[],
        fraternities: (fratsRes.data ?? []) as Fraternity[],
      };
    },
  });

  const parties = data?.parties ?? [];
  const fraternities = data?.fraternities ?? [];

  const generateRandomScore = (min: number, max: number) => {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  };

  const seedPartyRatings = async () => {
    if (!selectedParty) {
      toast.error("Please select a party");
      return;
    }

    const count = parseInt(ratingCount);
    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);

    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Rating count must be between 1 and 100");
      return;
    }
    if (isNaN(min) || isNaN(max) || min < 1 || max > 10 || min > max) {
      toast.error("Scores must be between 1-10 and min <= max");
      return;
    }

    setRatingLoading(true);

    try {
      // Use admin RPC function that generates seeded users
      let successCount = 0;
      let firstError: unknown = null;

      for (let i = 0; i < count; i++) {
        const { error } = await supabase.rpc('admin_seed_party_rating', {
          p_party_id: selectedParty,
          p_vibe: generateRandomScore(min, max),
          p_music: generateRandomScore(min, max),
          p_execution: generateRandomScore(min, max),
          p_party_quality: generateRandomScore(min, max),
        });

        if (error) {
          firstError ??= error;
          console.error('Seed party rating RPC error:', error);
          // Continue loop so we can still seed others if some fail
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Added ${successCount} party ratings`);
        await queryClient.invalidateQueries({ queryKey: ["admin"] });
        await queryClient.invalidateQueries({ queryKey: ["parties"] });
      } else {
        const msg =
          firstError && typeof firstError === 'object' && firstError && 'message' in firstError
            ? String((firstError as any).message)
            : 'Failed to add any ratings';
        toast.error(msg);
      }
    } catch (err) {
      console.error('Seed party ratings failed:', err);
      toast.error("Failed to add ratings");
    } finally {
      setRatingLoading(false);
    }
  };

  const seedReputationRatings = async () => {
    if (!selectedFrat) {
      toast.error("Please select a fraternity");
      return;
    }

    const count = parseInt(repRatingCount);
    const min = parseFloat(repMinScore);
    const max = parseFloat(repMaxScore);

    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Rating count must be between 1 and 100");
      return;
    }
    if (isNaN(min) || isNaN(max) || min < 1 || max > 10 || min > max) {
      toast.error("Scores must be between 1-10 and min <= max");
      return;
    }

    setRepRatingLoading(true);

    try {
      // Use admin RPC function that generates seeded users
      let successCount = 0;
      let firstError: unknown = null;

      for (let i = 0; i < count; i++) {
        const brotherhood = generateRandomScore(min, max);
        const community = generateRandomScore(min, max);
        const reputation = generateRandomScore(min, max);
        const combined = Math.round(((brotherhood + community + reputation) / 3) * 10) / 10;

        const { error } = await supabase.rpc('admin_seed_reputation_rating', {
          p_fraternity_id: selectedFrat,
          p_brotherhood: brotherhood,
          p_community: community,
          p_reputation: reputation,
          p_combined: combined,
        });

        if (error) {
          firstError ??= error;
          console.error('Seed reputation rating RPC error:', error);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Added ${successCount} reputation ratings`);
        await queryClient.invalidateQueries({ queryKey: ["admin"] });
        await queryClient.invalidateQueries({ queryKey: ["fraternities"] });
      } else {
        const msg =
          firstError && typeof firstError === 'object' && firstError && 'message' in firstError
            ? String((firstError as any).message)
            : 'Failed to add any ratings';
        toast.error(msg);
      }
    } catch (err) {
      console.error('Seed reputation ratings failed:', err);
      toast.error("Failed to add reputation ratings");
    } finally {
      setRepRatingLoading(false);
    }
  };

  const seedPost = async () => {
    if (!postText.trim()) {
      toast.error("Please enter post text");
      return;
    }

    setPostLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("chat_messages").insert({
        text: postText.trim(),
        user_id: user.id,
      });
      if (error) throw error;

      toast.success("Post created");
      setPostText("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create post");
    } finally {
      setPostLoading(false);
    }
  };

  const seedAIPosts = async () => {
    const count = parseInt(aiPostCount);
    if (isNaN(count) || count < 1 || count > 50) {
      toast.error("Count must be between 1 and 50");
      return;
    }

    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fratNames = fraternities.map(f => f.name);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chat-posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            topic: aiTopic,
            count,
            fraternityNames: fratNames,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate posts");
      }

      toast.success(`Generated ${data.count} posts!`);
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to generate posts");
    } finally {
      setAiLoading(false);
    }
  };

  const deletePartyRatings = async () => {
    if (!selectedParty) {
      toast.error("Please select a party first");
      return;
    }

    setDeletePartyRatingsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error, count } = await supabase
        .from("party_ratings")
        .delete()
        .eq("party_id", selectedParty)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success(`Deleted ratings for this party`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      await queryClient.invalidateQueries({ queryKey: ["parties"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete ratings");
    } finally {
      setDeletePartyRatingsLoading(false);
    }
  };

  const deleteRepRatings = async () => {
    if (!selectedFrat) {
      toast.error("Please select a fraternity first");
      return;
    }

    setDeleteRepRatingsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("reputation_ratings")
        .delete()
        .eq("fraternity_id", selectedFrat)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success(`Deleted reputation ratings for this fraternity`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      await queryClient.invalidateQueries({ queryKey: ["fraternities"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete ratings");
    } finally {
      setDeleteRepRatingsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Party Ratings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Party Ratings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Party</Label>
            <Select value={selectedParty} onValueChange={setSelectedParty}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a party" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Count</Label>
              <Input
                type="number"
                value={ratingCount}
                onChange={(e) => setRatingCount(e.target.value)}
                className="h-9"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={seedPartyRatings} 
              disabled={ratingLoading}
              size="sm"
              className="flex-1"
            >
              {ratingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={!selectedParty || deletePartyRatingsLoading}
                >
                  {deletePartyRatingsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Party Ratings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all your ratings for this party.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deletePartyRatings}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Reputation Ratings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Reputation Ratings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Fraternity</Label>
            <Select value={selectedFrat} onValueChange={setSelectedFrat}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a fraternity" />
              </SelectTrigger>
              <SelectContent>
                {fraternities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Count</Label>
              <Input
                type="number"
                value={repRatingCount}
                onChange={(e) => setRepRatingCount(e.target.value)}
                className="h-9"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={repMinScore}
                onChange={(e) => setRepMinScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={repMaxScore}
                onChange={(e) => setRepMaxScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={seedReputationRatings} 
              disabled={repRatingLoading}
              size="sm"
              className="flex-1"
            >
              {repRatingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={!selectedFrat || deleteRepRatingsLoading}
                >
                  {deleteRepRatingsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Reputation Ratings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all your ratings for this fraternity.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteRepRatings}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* AI Generated Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Chat Seeding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Topic</Label>
            <Select value={aiTopic} onValueChange={setAiTopic}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rush week">Rush Week</SelectItem>
                <SelectItem value="best parties this semester">Best Parties</SelectItem>
                <SelectItem value="fraternity reputations">Frat Reputations</SelectItem>
                <SelectItem value="pregame and mixer plans">Pregames & Mixers</SelectItem>
                <SelectItem value="greek life drama and tea">Drama & Tea</SelectItem>
                <SelectItem value="weekend party predictions">Weekend Predictions</SelectItem>
                <SelectItem value="brotherhood and chapter events">Brotherhood Events</SelectItem>
                <SelectItem value="random greek life thoughts">Random Thoughts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Number of Posts</Label>
            <Input
              type="number"
              value={aiPostCount}
              onChange={(e) => setAiPostCount(e.target.value)}
              className="h-9"
              min={1}
              max={50}
            />
          </div>

          <Button 
            onClick={seedAIPosts} 
            disabled={aiLoading}
            size="sm"
            className="w-full"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-1" />
                Generate {aiPostCount} Posts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Post */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Manual Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Post Text</Label>
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Enter post content..."
              rows={2}
            />
          </div>

          <Button 
            onClick={seedPost} 
            disabled={postLoading}
            size="sm"
            className="w-full"
          >
            {postLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
