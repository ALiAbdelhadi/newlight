export async function POST(req: Request) {
    const { role, password } = await req.json();

    const isValidRole = role === process.env.ADMIN_NAME;
    const isValidPassword = password === process.env.ADMIN_PASSWORD;

    console.log("Validation:", { isValidRole, isValidPassword });

    if (isValidRole && isValidPassword) {
        return Response.json({ success: true });
    } else {
        return Response.json({
            success: false,
            debug: {
                roleMatch: isValidRole,
                passwordMatch: isValidPassword
            }
        });
    }
}