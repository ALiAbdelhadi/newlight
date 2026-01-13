"use client";

import { Container } from '@/components/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Calendar, CheckCircle, Eye, Mail, Phone, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ContactFormResponse {
    id: string;
    contactFormId: string;
    adminId: string;
    message: string;
    createdAt: string;
    updatedAt: string;
}

interface ContactFormTag {
    id: string;
    contactFormId: string;
    tag: string;
    createdAt: string;
}

interface ContactForm {
    id: string;
    fullName: string;
    jobPosition: string;
    email: string;
    phoneNumber: string;
    message?: string | null;
    status: string;
    source: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    isRead: boolean;
    readAt?: string | null;
    readBy?: string | null;
    priority: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    responses?: ContactFormResponse[];
    tags?: ContactFormTag[];
}

interface ContactFormsResponse {
    contactForms: ContactForm[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export default function ContactFormsDashboard() {
    const [contactForms, setContactForms] = useState<ContactForm[]>([]);
    const [filteredForms, setFilteredForms] = useState<ContactForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedForm, setSelectedForm] = useState<ContactForm | null>(null);

    const fetchContactForms = async () => {
        try {
            const response = await fetch('/api/contact-forms');
            const data: ContactFormsResponse = await response.json();
            setContactForms(data.contactForms || []);
            setFilteredForms(data.contactForms || []);
        } catch (error) {
            console.error('Error fetching contact forms:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterForms = useCallback(() => {
        let filtered = [...contactForms];

        if (filter === 'unread') {
            filtered = filtered.filter(form => !form.isRead);
        } else if (filter === 'read') {
            filtered = filtered.filter(form => form.isRead);
        }

        if (searchTerm) {
            filtered = filtered.filter(form =>
                form.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                form.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                form.phoneNumber.includes(searchTerm)
            );
        }

        setFilteredForms(filtered);
    }, [contactForms, filter, searchTerm]);

    useEffect(() => {
        fetchContactForms();
    }, []);

    useEffect(() => {
        filterForms();
    }, [filterForms]);

    const markAsRead = async (formId: string) => {
        try {
            await fetch(`/api/contact-forms/${formId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });

            setContactForms(prev =>
                prev.map(form =>
                    form.id === formId ? { ...form, isRead: true } : form
                )
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const deleteForm = async (formId: string) => {
        if (!confirm('Are you sure you want to delete this contact form?')) {
            return;
        }

        try {
            await fetch(`/api/contact-forms/${formId}`, {
                method: 'DELETE',
            });

            setContactForms(prev => prev.filter(form => form.id !== formId));
        } catch (error) {
            console.error('Error deleting form:', error);
        }
    };

    const unreadCount = contactForms.filter(f => !f.isRead).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <Container>
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-primary">
                                Contact Forms
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Manage customer inquiries and contact requests
                            </p>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-2">
                            {unreadCount} Unread
                        </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setFilter('all')}
                                variant={filter === 'all' ? 'default' : 'outline'}
                            >
                                All ({contactForms.length})
                            </Button>
                            <Button
                                onClick={() => setFilter('unread')}
                                variant={filter === 'unread' ? 'default' : 'outline'}
                            >
                                Unread ({unreadCount})
                            </Button>
                            <Button
                                onClick={() => setFilter('read')}
                                variant={filter === 'read' ? 'default' : 'outline'}
                            >
                                Read ({contactForms.length - unreadCount})
                            </Button>
                        </div>
                    </div>
                </div>

                {filteredForms.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <CardTitle className="mb-2">
                                No contact forms found
                            </CardTitle>
                            <CardDescription>
                                {searchTerm ? 'Try a different search term' : 'New submissions will appear here'}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredForms.map((form) => (
                            <Card
                                key={form.id}
                                className={`transition-all hover:shadow-md ${!form.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                                                    {form.fullName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {form.fullName}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Briefcase className="w-4 h-4" />
                                                    <span>{form.jobPosition}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!form.isRead && (
                                                <Badge>New</Badge>
                                            )}
                                            <Button
                                                onClick={() => markAsRead(form.id)}
                                                variant="ghost"
                                                size="icon"
                                                title="Mark as read"
                                            >
                                                <CheckCircle className={`w-5 h-5 ${form.isRead ? 'text-green-500' : 'text-gray-400'}`} />
                                            </Button>
                                            <Button
                                                onClick={() => setSelectedForm(form)}
                                                variant="ghost"
                                                size="icon"
                                                title="View details"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                onClick={() => deleteForm(form.id)}
                                                variant="ghost"
                                                size="icon"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="w-4 h-4" />
                                            <a href={`mailto:${form.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                                {form.email}
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="w-4 h-4" />
                                            <a href={`tel:${form.phoneNumber}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                                {form.phoneNumber}
                                            </a>
                                        </div>
                                    </div>

                                    {form.message && (
                                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {form.message}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            Submitted {new Date(form.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Contact Form Details</DialogTitle>
                            <DialogDescription>
                                View detailed information about this contact submission
                            </DialogDescription>
                        </DialogHeader>

                        {selectedForm && (
                            <div className="space-y-4">
                                <div>
                                    <Label>Full Name</Label>
                                    <p className="text-lg text-foreground mt-1">{selectedForm.fullName}</p>
                                </div>
                                <div>
                                    <Label>Job Position</Label>
                                    <p className="text-lg text-foreground mt-1">{selectedForm.jobPosition}</p>
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <p className="text-lg text-foreground mt-1">{selectedForm.email}</p>
                                </div>
                                <div>
                                    <Label>Phone Number</Label>
                                    <p className="text-lg text-foreground mt-1">{selectedForm.phoneNumber}</p>
                                </div>
                                {selectedForm.message && (
                                    <div>
                                        <Label>Message</Label>
                                        <p className="text-lg text-foreground mt-1">{selectedForm.message}</p>
                                    </div>
                                )}
                                <div>
                                    <Label>Submitted</Label>
                                    <p className="text-lg text-foreground mt-1">
                                        {new Date(selectedForm.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                onClick={() => setSelectedForm(null)}
                                variant="outline"
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    if (selectedForm) {
                                        markAsRead(selectedForm.id);
                                        setSelectedForm(null);
                                    }
                                }}
                            >
                                Mark as Read & Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Container>
        </div>
    );
}