export async function POST(req: Request) {
    try {
        const { role, password } = await req.json();
        const ADMIN_NAME = process.env.ADMIN_NAME;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (!ADMIN_NAME || !ADMIN_PASSWORD) {
            console.error("Admin credentials not configured in environment variables");
            return Response.json(
                { 
                    success: false, 
                    error: "Server configuration error" 
                },
                { status: 500 }
            );
        }

        if (!role || !password) {
            return Response.json(
                { 
                    success: false, 
                    error: "Role and password are required" 
                },
                { status: 400 }
            );
        }

        const isValidRole = role.trim() === ADMIN_NAME.trim();
        const isValidPassword = password.trim() === ADMIN_PASSWORD.trim();

        if (isValidRole && isValidPassword) {
            return Response.json({ success: true });
        } else {
            return Response.json({
                success: false,
                error: "Invalid credentials"
            }, { status: 401 });
        }
    } catch (error) {
        console.error("Admin verification error:", error);
        return Response.json(
            { 
                success: false, 
                error: "Internal server error" 
            },
            { status: 500 }
        );
    }
}