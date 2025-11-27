import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: { dependsOn: true },
    });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching todos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, dependencies } = await request.json();
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check for circular dependencies (optional)
    // We'll do a simple check: task cannot depend on itself or any task that depends on it
    if (dependencies?.includes(/* new ID? */)) {
      return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate + "T00:00") : null,
        dependsOn: dependencies?.length
          ? {
              connect: dependencies.map((id: number) => ({ id })),
            }
          : undefined,
      },
      include: { dependsOn: true },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating todo', details: error }, { status: 500 });
  }
}