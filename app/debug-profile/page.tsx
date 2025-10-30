"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";

export default function ProfileDebugPage() {
  const [userId, setUserId] = useState("");
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);

  const debugProfile = async (targetUserId: string) => {
    if (!targetUserId) return;

    setLoading(true);
    try {
      console.log("Debugging profile for user:", targetUserId);

      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      console.log("Profile:", profile);
      if (profileError) console.log("Profile Error:", profileError);

      // Check created NFTs
      const { data: createdNfts, error: createdError } = await supabase
        .from("nfts")
        .select(`
          id,
          title,
          media_url,
          price,
          status,
          sale_type,
          likes,
          views,
          created_at,
          creator_id,
          owner_id
        `)
        .eq("creator_id", targetUserId);

      console.log("Created NFTs:", createdNfts);
      if (createdError) console.log("Created NFTs Error:", createdError);

      // Check owned NFTs
      const { data: ownedNfts, error: ownedError } = await supabase
        .from("nfts")
        .select(`
          id,
          title,
          media_url,
          price,
          status,
          sale_type,
          views,
          created_at,
          creator_id,
          owner_id,
          creator:profiles!nfts_creator_id_fkey(id, name, avatar_url)
        `)
        .eq("owner_id", targetUserId);

      console.log("Owned NFTs:", ownedNfts);
      if (ownedError) console.log("Owned NFTs Error:", ownedError);

      // Check all NFTs to see what exists
      const { data: allNfts, error: allError } = await supabase
        .from("nfts")
        .select("id, title, creator_id, owner_id, status")
        .limit(10);

      console.log("All NFTs (sample):", allNfts);
      if (allError) console.log("All NFTs Error:", allError);

      // Get current user for reference
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("Current User:", user);

      setDebugData({
        profile,
        profileError,
        createdNfts,
        createdError,
        ownedNfts,
        ownedError,
        allNfts,
        allError,
        currentUser: user,
        userError
      });

    } catch (error) {
      console.error("Debug error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Profile Debug Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <Button 
                onClick={() => debugProfile(userId)}
                disabled={loading || !userId}
              >
                {loading ? "Debugging..." : "Debug Profile"}
              </Button>
            </div>

            {debugData && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Profile Data:</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(debugData.profile, null, 2)}
                  </pre>
                  {debugData.profileError && (
                    <div className="text-red-500 text-sm mt-2">
                      Error: {JSON.stringify(debugData.profileError, null, 2)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Created NFTs ({debugData.createdNfts?.length || 0}):</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(debugData.createdNfts, null, 2)}
                  </pre>
                  {debugData.createdError && (
                    <div className="text-red-500 text-sm mt-2">
                      Error: {JSON.stringify(debugData.createdError, null, 2)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Owned NFTs ({debugData.ownedNfts?.length || 0}):</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(debugData.ownedNfts, null, 2)}
                  </pre>
                  {debugData.ownedError && (
                    <div className="text-red-500 text-sm mt-2">
                      Error: {JSON.stringify(debugData.ownedError, null, 2)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">All NFTs (Sample):</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(debugData.allNfts, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Current User:</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(debugData.currentUser, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}