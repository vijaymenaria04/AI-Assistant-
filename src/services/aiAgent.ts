import { db } from './db';
import { voice } from './voice';
import { androidAutomation } from './androidAutomation';
import { BusinessId } from '../types/database';

export interface ParsedAgentResult {
  action: string;
  business_id?: BusinessId;
  business_name?: string;
  requires_owner_confirmation: boolean;
  speech_response: string;
  parameters: {
    amount?: number;
    item_name?: string;
    quantity?: number;
    unit?: string;
    category?: string;
    payment_method?: string;
    supplier_name?: string;
    contact_name?: string;
    phone_number?: string;
    app_name?: string;
    query?: string;
    location?: string;
    reminder_title?: string;
    reminder_time?: string;
    target?: string;
    period?: string;
    transaction_type?: string;
    notes?: string;
  };
}

class AIAgentService {
  public async processCommand(
    prompt: string,
    currentBusinessId: BusinessId = 'jain-sweets'
  ): Promise<{ result: ParsedAgentResult; executed: boolean }> {
    try {
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: { currentBusinessId }
        })
      });

      const data = await response.json().catch(() => ({}));
      const result: ParsedAgentResult = data.result || this.localFallbackParser(prompt, currentBusinessId);

      // Fallback business matching if missing
      if (!result.business_id && result.business_name) {
        const lower = result.business_name.toLowerCase();
        if (lower.includes('jain')) result.business_id = 'jain-sweets';
        else if (lower.includes('paan')) result.business_id = 'paan-bai';
        else if (lower.includes('kesar')) result.business_id = 'kesarwadi';
        else if (lower.includes('personal')) result.business_id = 'personal';
      }
      if (!result.business_id) {
        result.business_id = currentBusinessId;
      }

      return { result, executed: false };
    } catch (err) {
      console.warn('AI Processing Warning (using local parser):', err);
      const fallback = this.localFallbackParser(prompt, currentBusinessId);
      return { result: fallback, executed: false };
    }
  }

  // Execute confirmed action in Database / Android System
  public async executeAction(result: ParsedAgentResult): Promise<string> {
    const params = result.parameters || {};
    const busId = result.business_id || 'jain-sweets';
    let successMessage = '';

    switch (result.action) {
      case 'ADD_SALE': {
        const amount = params.amount || 0;
        const method = (params.payment_method as any) || 'cash';
        const itemName = params.item_name || 'General Item';
        const qty = params.quantity || 1;
        const unit = params.unit || 'pcs';

        await db.addSale({
          businessId: busId,
          amount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: method,
          items: [
            {
              id: 'item_1',
              itemName,
              quantity: qty,
              unit,
              price: amount / Math.max(1, qty),
              total: amount
            }
          ],
          notes: params.notes || `Voice Sale Entry`
        });

        androidAutomation.playSoundEffect('success');
        successMessage = `Sale of ₹${amount} saved successfully for ${result.business_name || busId}.`;
        break;
      }

      case 'ADD_EXPENSE': {
        const amount = params.amount || 0;
        const cat = (params.category as any) || 'other';
        const method = (params.payment_method as any) || 'cash';

        await db.addExpense({
          businessId: busId,
          amount,
          category: cat,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: method,
          notes: params.notes || `Voice Expense Entry`
        });

        androidAutomation.playSoundEffect('success');
        successMessage = `Expense of ₹${amount} (${cat.replace('_', ' ')}) recorded successfully.`;
        break;
      }

      case 'ADD_PURCHASE': {
        const amount = params.amount || 0;
        const itemName = params.item_name || 'Goods';
        const qty = params.quantity || 1;
        const unit = params.unit || 'kg';
        const supName = params.supplier_name || 'Supplier';

        await db.addPurchase({
          businessId: busId,
          itemName,
          quantity: qty,
          unit,
          amount,
          supplierName: supName,
          date: new Date().toISOString().split('T')[0],
          paidAmount: amount // Assume paid unless specified
        });

        androidAutomation.playSoundEffect('success');
        successMessage = `Purchase of ${qty} ${unit} ${itemName} for ₹${amount} recorded.`;
        break;
      }

      case 'PAY_SUPPLIER': {
        const amount = params.amount || 0;
        const supName = params.supplier_name || 'Supplier';

        const suppliers = await db.getSuppliers(busId);
        let sup = suppliers.find((s) => s.name.toLowerCase().includes(supName.toLowerCase()));
        if (!sup) {
          sup = await db.addSupplier({ businessId: busId, name: supName, contact: '' });
        }

        await db.paySupplier(sup.id, amount, 'upi', `Payment to ${supName}`);
        androidAutomation.playSoundEffect('success');
        successMessage = `Paid ₹${amount} to ${supName} successfully.`;
        break;
      }

      case 'ADD_REMINDER': {
        const title = params.reminder_title || result.speech_response || 'Reminder';
        const time = params.reminder_time || new Date(Date.now() + 3600000).toISOString();

        await db.addReminder({
          title,
          dateTime: time,
          priority: 'medium',
          businessId: busId
        });

        androidAutomation.playSoundEffect('beep');
        successMessage = `Reminder set: "${title}".`;
        break;
      }

      case 'CALL_CONTACT': {
        const contact = params.contact_name || params.phone_number || '';
        androidAutomation.initiatePhoneCall(contact);
        successMessage = `Initiating phone call to ${contact}...`;
        break;
      }

      case 'OPEN_APP': {
        const appName = params.app_name || 'App';
        androidAutomation.openApp(appName);
        successMessage = `Opening ${appName}...`;
        break;
      }

      case 'SEARCH_WEB': {
        const query = params.query || '';
        androidAutomation.searchWeb(query);
        successMessage = `Searching web for "${query}"...`;
        break;
      }

      case 'OPEN_MAPS': {
        const loc = params.location || '';
        androidAutomation.openMaps(loc);
        successMessage = `Opening Google Maps for ${loc}...`;
        break;
      }

      case 'ADD_PERSONAL_TRANSACTION': {
        const amount = params.amount || 0;
        const type = (params.transaction_type as any) || 'expense';

        await db.addPersonalTransaction({
          type,
          amount,
          category: params.category || 'General',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'upi',
          notes: params.notes || 'Personal Transaction'
        });

        androidAutomation.playSoundEffect('success');
        successMessage = `Personal ${type} of ₹${amount} saved.`;
        break;
      }

      case 'QUERY_STAFF_COUNT': {
        const staff = await db.getStaff(busId);
        const count = staff.length;
        const busName = busId === 'jain-sweets' ? 'Jain Sweets' : busId === 'paan-bai' ? 'Paan Bai Canteen' : busId === 'kesarwadi' ? 'Kesarwadi Canteen' : 'Gopal Caterers';
        successMessage = `${busName} mein abhi total ${count} staff members assigned hain.`;
        break;
      }

      case 'QUERY_STAFF_SHORTAGE': {
        const staff = await db.getStaff(busId);
        const mp = await db.getManpowerPlans(busId);
        const required = mp.reduce((sum, item) => sum + item.requiredCount, 0);
        const assigned = staff.length;
        const shortage = Math.max(0, required - assigned);
        const busName = busId === 'jain-sweets' ? 'Jain Sweets' : busId === 'paan-bai' ? 'Paan Bai Canteen' : busId === 'kesarwadi' ? 'Kesarwadi Canteen' : 'Gopal Caterers';

        if (shortage > 0) {
          successMessage = `${busName} mein ${required} required staff ke mukable ${assigned} assigned hain. Total ${shortage} bande kam hain.`;
        } else {
          successMessage = `${busName} mein required staff poora hai (${assigned}/${required}). Koi shortage nahi hai.`;
        }
        break;
      }

      case 'QUERY_PENDING_SALARY': {
        const staff = await db.getStaff();
        const pendingWithAdv = staff.filter((s) => (s.advanceBalance || 0) > 0);
        if (pendingWithAdv.length > 0) {
          const names = pendingWithAdv.map((s) => `${s.name} (Advance ₹${s.advanceBalance})`).join(', ');
          successMessage = `In employees ka advance balance baaki hai: ${names}.`;
        } else {
          successMessage = `Sabhi employees ka salary and advance cleared hai.`;
        }
        break;
      }

      case 'QUERY_CATERING_AVAILABILITY': {
        const orders = await db.getCateringOrders();
        const staff = await db.getStaff();
        const upcomingOrder = orders.find((o) => o.status === 'confirmed' || o.status === 'enquiry');
        const totalWaiters = staff.filter((s) => s.role.toLowerCase().includes('waiter') || s.role.toLowerCase().includes('service')).length || staff.length;

        if (upcomingOrder) {
          const available = Math.max(0, totalWaiters - upcomingOrder.assignedStaffIds.length);
          successMessage = `${upcomingOrder.eventDate} ke ${upcomingOrder.customerName} order ke liye ${available} staff members available hain.`;
        } else {
          successMessage = `Total ${totalWaiters} staff members catering availability ke liye tayyar hain.`;
        }
        break;
      }

      case 'ASSIGN_CATERING_STAFF': {
        const orders = await db.getCateringOrders();
        const staff = await db.getStaff();
        const activeOrder = orders.find((o) => o.status === 'confirmed' || o.status === 'enquiry');

        if (activeOrder) {
          const unassignedIds = staff.map((s) => s.id).slice(0, activeOrder.requiredWaiters + activeOrder.requiredCooks);
          await db.assignStaffToCateringOrder(activeOrder.id, unassignedIds);
          successMessage = `${activeOrder.customerName} ke event ke liye ${unassignedIds.length} staff members successfully assign kar diye gaye hain.`;
        } else {
          successMessage = `Assign karne ke liye koi active catering booking nahi mili.`;
        }
        break;
      }

      default:
        successMessage = result.speech_response || 'Task completed.';
        break;
    }

    // Save into AI history log
    await db.addAIHistory({
      rawCommand: result.speech_response,
      action: result.action,
      status: 'executed',
      speechResponse: successMessage
    });

    // Speak completion response if TTS enabled
    const settings = await db.getSettings();
    if (settings.ttsEnabled) {
      voice.speak(successMessage);
    }

    return successMessage;
  }

  // Basic regex fallback parser if network offline
  private localFallbackParser(prompt: string, busId: BusinessId): ParsedAgentResult {
    const lower = prompt.toLowerCase();
    const amountMatch = lower.match(/(\d+)\s*(rupaye|rs|rupees|ki|ka)?/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;

    let targetBus = busId;
    if (lower.includes('jain')) targetBus = 'jain-sweets';
    else if (lower.includes('paan')) targetBus = 'paan-bai';
    else if (lower.includes('kesar')) targetBus = 'kesarwadi';
    else if (lower.includes('caterer') || lower.includes('gopal')) targetBus = 'gopal-caterers';

    if (lower.includes('staff') && (lower.includes('kitne') || lower.includes('count'))) {
      return {
        action: 'QUERY_STAFF_COUNT',
        business_id: targetBus,
        requires_owner_confirmation: false,
        speech_response: `Checking staff count for ${targetBus}...`,
        parameters: {}
      };
    } else if (lower.includes('kam') || lower.includes('shortage') || lower.includes('bande')) {
      return {
        action: 'QUERY_STAFF_SHORTAGE',
        business_id: targetBus,
        requires_owner_confirmation: false,
        speech_response: `Checking staff shortage for ${targetBus}...`,
        parameters: {}
      };
    } else if (lower.includes('salary') || lower.includes('baaki') || lower.includes('advance')) {
      return {
        action: 'QUERY_PENDING_SALARY',
        requires_owner_confirmation: false,
        speech_response: `Checking pending salary and advances...`,
        parameters: {}
      };
    } else if (lower.includes('waiter') || lower.includes('available') || lower.includes('catering')) {
      return {
        action: 'QUERY_CATERING_AVAILABILITY',
        requires_owner_confirmation: false,
        speech_response: `Checking catering staff availability...`,
        parameters: {}
      };
    } else if (lower.includes('assign') || lower.includes('laga do')) {
      return {
        action: 'ASSIGN_CATERING_STAFF',
        requires_owner_confirmation: true,
        speech_response: `Assigning available staff to catering order. Confirm?`,
        parameters: {}
      };
    } else if (lower.includes('sale') || lower.includes('becha') || lower.includes('bikri')) {
      return {
        action: 'ADD_SALE',
        business_id: targetBus,
        requires_owner_confirmation: true,
        speech_response: `Recording sale of ₹${amount} for business. Confirm?`,
        parameters: { amount }
      };
    } else if (lower.includes('kharch') || lower.includes('expense') || lower.includes('paisa gaya')) {
      return {
        action: 'ADD_EXPENSE',
        business_id: targetBus,
        requires_owner_confirmation: true,
        speech_response: `Recording expense of ₹${amount}. Confirm?`,
        parameters: { amount, category: 'other' }
      };
    } else if (lower.includes('call') || lower.includes('lagao')) {
      const name = prompt.replace(/(call|lagao|ko|karo)/gi, '').trim();
      return {
        action: 'CALL_CONTACT',
        requires_owner_confirmation: true,
        speech_response: `Call ${name}?`,
        parameters: { contact_name: name }
      };
    } else if (lower.includes('open') || lower.includes('kholo')) {
      return {
        action: 'OPEN_APP',
        requires_owner_confirmation: false,
        speech_response: `Opening application...`,
        parameters: { app_name: prompt }
      };
    }

    return {
      action: 'UNKNOWN_QUERY',
      requires_owner_confirmation: false,
      speech_response: `Command received: "${prompt}". Please specify action.`,
      parameters: {}
    };
  }
}

export const aiAgent = new AIAgentService();
