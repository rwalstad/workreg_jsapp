"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getUserById, UserResponse } from "../../lib/api";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from "sonner";
import { useActions } from '../../../actionsContext';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";

interface FormData {
  fname: string;
  lname: string;
  email: string;
  profile_picture: string;
}

export default function UserProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<Partial<FormData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fname: "",
    lname: "",
    email: "",
    profile_picture: "",
  });
  const [originalFormData, setOriginalFormData] = useState<FormData>({
    fname: "",
    lname: "",
    email: "",
    profile_picture: "",
  });

  // Get the setUnsavedChanges function from our context

  const { getIcon } = useActions();

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getUserById(session.user.id)
      .then((data: UserResponse) => {
        if (data) {
          console.log("✅ Starting definition with data: ", data);
          // Data is a single user object, not an array
          const userData: FormData = {
            fname: data.fname ?? "",
            lname: data.lname ?? "",
            email: data.email ?? "",
            profile_picture: data.profile_picture ?? "",
          };

          console.log("✅ User data defined for usr :", userData.fname + ' ' + userData.lname);
          setUser(userData);

          // Set both current form data and original form data
          setFormData(userData);
          setOriginalFormData(userData);
        } else {
          setError("User not found.");
        }
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data.");
      })
      .finally(() => setLoading(false));
  }, [session]);

  // Check for unsaved changes by comparing current form data with original form data


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.warning("Test mode: Changes won't be saved.");
      return;
    }

    try {
      const response = await fetch(`/api/srvRoutes?usrId=${session.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      // Update original form data after successful save
      setOriginalFormData({...formData});

      // Reset unsaved changes flag
      

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile.");
    }
  };

  const getInitials = () => {
    if (formData.fname && formData.lname) {
      return `${formData.fname.charAt(0)}${formData.lname.charAt(0)}`.toUpperCase();
    }
    return "U";
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {loading ? (
        <div className="flex justify-center items-center p-8">
          {getIcon("loader", "w-6 h-6 text-blue-600 animate-spin mr-2")}
          <p>Loading profile data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <div className="flex items-center mb-2">
            {getIcon("alert-circle", "w-4 h-4 mr-2")}
            <h3 className="font-medium mb-0">Error loading profile</h3>
          </div>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Card - Column 1 */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>User Profile</CardTitle>
                <CardDescription>
                  Your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={formData.profile_picture} alt={`${formData.fname} ${formData.lname}`} />
                  <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-medium">{formData.fname} {formData.lname}</h3>
                <p className="text-gray-500 mt-1">{formData.email}</p>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-4">
                <p className="text-sm text-gray-500">
                  Update your profile information in the form
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* Profile Form - Columns 2-3 */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                  Make changes to your profile information
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fname">First Name</Label>
                      <Input
                        id="fname"
                        name="fname"
                        value={formData.fname}
                        onChange={handleChange}
                        placeholder="First Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lname">Last Name</Label>
                      <Input
                        id="lname"
                        name="lname"
                        value={formData.lname}
                        onChange={handleChange}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500">
                      Email address cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile_picture">Profile Picture URL</Label>
                    <Input
                      id="profile_picture"
                      name="profile_picture"
                      value={formData.profile_picture}
                      onChange={handleChange}
                      placeholder="https://example.com/your-image.jpg"
                    />
                    <p className="text-xs text-gray-500">
                      Enter a URL for your profile picture
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData(originalFormData)}
                    disabled={JSON.stringify(formData) === JSON.stringify(originalFormData)}
                  >
                    {getIcon("rotate-ccw", "w-4 h-4 mr-2")}
                    Reset Changes
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={JSON.stringify(formData) === JSON.stringify(originalFormData)}
                  >
                    {getIcon("save", "w-4 h-4 mr-2 inline")}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}